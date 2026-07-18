import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { CredentialType, NodeType, WebhookProvider } from "@/db/enums";
import {
  credential,
  providerAccount,
  providerOAuthGrant,
  webhook,
} from "@/db/schema";
import { oauthProviderConfigSchema } from "@/features/provider-accounts/contracts";
import {
  getWorkflowProviderAccountReadiness,
  isWorkflowProviderAccountAvailableToScope,
} from "@/features/workflows/lib/workflow-provider-account-readiness";
import {
  getWorkflowProviderBindingSpec,
  isWorkflowProviderBindingNodeType,
  readWorkflowProviderAccountId,
} from "@/features/workflows/lib/workflow-provider-binding";
import { googleFormTriggerConfigSchema } from "@/features/google-forms/server/webhook-contract";
import { resolveEmailSender } from "@/features/delivery/server/email-sender";
import { resolveSmsSender } from "@/features/sms/server/sms-sender";

const nodeDataSchema = z.record(z.string(), z.unknown()).catch({});

type ProviderReadinessNode = {
  credentialId: string | null;
  data: unknown;
  id: string;
  providerAccountId: string | null;
  type: NodeType;
};

const REQUIRED_CREDENTIAL_TYPES = new Map<NodeType, CredentialType>([
  [NodeType.GEMINI, CredentialType.GEMINI],
  [NodeType.TELEGRAM_TRIGGER, CredentialType.TELEGRAM_BOT],
  [NodeType.TELEGRAM_EXECUTION, CredentialType.TELEGRAM_BOT],
]);

const REQUIRED_WEBHOOK_PROVIDERS = new Map<NodeType, WebhookProvider>([
  [NodeType.SLACK, WebhookProvider.SLACK],
  [NodeType.DISCORD, WebhookProvider.DISCORD],
]);

export async function getWorkflowProviderReadinessIssues(input: {
  nodes: readonly ProviderReadinessNode[];
  organizationId: string;
  locationId: string | null;
}): Promise<string[]> {
  const issues: string[] = [];
  const scope = {
    organizationId: input.organizationId,
    locationId: input.locationId,
  };

  if (
    input.nodes.some(
      (node) =>
        node.type === NodeType.GOOGLE_FORM_TRIGGER &&
        !googleFormTriggerConfigSchema.safeParse(node.data).success,
    )
  ) {
    issues.push(
      "Save a secure webhook token for every Google Form trigger before activation.",
    );
  }

  const emailDomainIds = [
    ...new Set(
      input.nodes.flatMap((node) => {
        if (node.type !== NodeType.SEND_EMAIL) return [];
        const data = nodeDataSchema.parse(node.data);
        return [
          typeof data.emailDomainId === "string" && data.emailDomainId.trim()
            ? data.emailDomainId.trim()
            : null,
        ];
      }),
    ),
  ];
  for (const emailDomainId of emailDomainIds) {
    try {
      await resolveEmailSender({
        organizationId: input.organizationId,
        locationId: input.locationId,
        emailDomainId,
        purpose: "TRANSACTIONAL",
      });
    } catch {
      issues.push(
        "Connect an active Resend account and verified sender domain before activating email steps.",
      );
      break;
    }
  }

  if (input.nodes.some((node) => node.type === NodeType.SEND_SMS)) {
    const smsConfig = await resolveSmsSender({
      organizationId: input.organizationId,
      locationId: input.locationId,
    });
    if (!smsConfig) {
      issues.push(
        "Connect an active SMS provider and sender number before activating SMS steps.",
      );
    }
  }

  const oauthBindings = input.nodes.flatMap((node) => {
    if (!isWorkflowProviderBindingNodeType(node.type)) return [];
    const data = nodeDataSchema.parse(node.data);
    const dataProviderAccountId = readWorkflowProviderAccountId(data);
    if (
      !dataProviderAccountId ||
      node.providerAccountId !== dataProviderAccountId
    ) {
      issues.push("Select and save a provider account for every connected-app node.");
      return [];
    }
    return [
      {
        id: dataProviderAccountId,
        spec: getWorkflowProviderBindingSpec(node.type),
      },
    ];
  });
  const providerAccountIds = [
    ...new Set(oauthBindings.map((binding) => binding.id)),
  ];
  const providerRows = providerAccountIds.length
    ? await db
        .select({
          id: providerAccount.id,
          organizationId: providerAccount.organizationId,
          locationId: providerAccount.locationId,
          provider: providerAccount.provider,
          status: providerAccount.status,
          config: providerAccount.config,
          grantedScopes: providerOAuthGrant.scopes,
        })
        .from(providerAccount)
        .leftJoin(
          providerOAuthGrant,
          eq(providerOAuthGrant.providerAccountId, providerAccount.id),
        )
        .where(
          and(
            eq(providerAccount.organizationId, input.organizationId),
            inArray(providerAccount.id, providerAccountIds),
          ),
        )
    : [];
  const providerById = new Map(providerRows.map((row) => [row.id, row]));
  const oauthBindingInvalid = oauthBindings.some((binding) => {
    const row = providerById.get(binding.id);
    if (!row || row.provider !== binding.spec.provider) return true;
    const config = oauthProviderConfigSchema.safeParse(row.config);
    const available = isWorkflowProviderAccountAvailableToScope(
      {
        organizationId: row.organizationId,
        locationId: row.locationId,
        inheritToLocations: config.success
          ? config.data.inheritToLocations
          : false,
      },
      scope,
    );
    return (
      !available ||
      !getWorkflowProviderAccountReadiness(
        row,
        binding.spec.requiredScopes,
      ).ready
    );
  });
  if (oauthBindingInvalid) {
    issues.push(
      "Reconnect connected-app nodes to active accounts with the required permissions in this workspace.",
    );
  }

  const credentialBindings = input.nodes.flatMap((node) => {
    const expectedType = REQUIRED_CREDENTIAL_TYPES.get(node.type);
    if (!expectedType) return [];
    const data = nodeDataSchema.parse(node.data);
    const dataCredentialId =
      typeof data.credentialId === "string" ? data.credentialId : null;
    if (!dataCredentialId || node.credentialId !== dataCredentialId) {
      issues.push("Save every credential-backed node before activation.");
      return [];
    }
    return [{ id: dataCredentialId, expectedType }];
  });

  const credentialIds = [...new Set(credentialBindings.map((item) => item.id))];
  const credentialRows = credentialIds.length
    ? await db
        .select({ id: credential.id, type: credential.type })
        .from(credential)
        .where(
          and(
            inArray(credential.id, credentialIds),
            eq(credential.organizationId, input.organizationId),
            input.locationId === null
              ? isNull(credential.locationId)
              : eq(credential.locationId, input.locationId),
            eq(credential.isActive, true),
          ),
        )
    : [];
  const credentialById = new Map(
    credentialRows.map((row) => [row.id, row.type]),
  );
  if (
    credentialBindings.some(
      (binding) => credentialById.get(binding.id) !== binding.expectedType,
    )
  ) {
    issues.push(
      "Reconnect credential-backed nodes to active accounts in this workspace.",
    );
  }

  const webhookBindings = input.nodes.flatMap((node) => {
    const expectedProvider = REQUIRED_WEBHOOK_PROVIDERS.get(node.type);
    if (!expectedProvider) return [];
    const data = nodeDataSchema.parse(node.data);
    const webhookId = typeof data.webhookId === "string" ? data.webhookId : null;
    if (!webhookId) {
      issues.push("Select a scoped webhook for every webhook-backed node.");
      return [];
    }
    return [{ id: webhookId, expectedProvider }];
  });
  const webhookIds = [...new Set(webhookBindings.map((item) => item.id))];
  const webhookRows = webhookIds.length
    ? await db
        .select({ id: webhook.id, provider: webhook.provider })
        .from(webhook)
        .where(
          and(
            inArray(webhook.id, webhookIds),
            eq(webhook.organizationId, input.organizationId),
            input.locationId === null
              ? isNull(webhook.locationId)
              : eq(webhook.locationId, input.locationId),
          ),
        )
    : [];
  const webhookById = new Map(
    webhookRows.map((row) => [row.id, row.provider]),
  );
  if (
    webhookBindings.some(
      (binding) => webhookById.get(binding.id) !== binding.expectedProvider,
    )
  ) {
    issues.push("Reconnect webhook-backed nodes within this workspace.");
  }

  return [...new Set(issues)];
}
