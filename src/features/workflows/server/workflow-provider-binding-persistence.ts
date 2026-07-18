import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { db } from "@/db";
import { providerAccount } from "@/db/schema";
import { oauthProviderConfigSchema } from "@/features/provider-accounts/contracts";
import { providerAccountMatchesScope } from "@/features/provider-accounts/lib/scope-policy";
import {
  getWorkflowProviderBindingSpec,
  isWorkflowProviderBindingNodeType,
  readWorkflowProviderAccountId,
} from "@/features/workflows/lib/workflow-provider-binding";

export type WorkflowProviderBindingDraftNode = {
  type?: string | null;
  data?: Record<string, unknown>;
};

export function getDraftNodeProviderAccountId(
  node: WorkflowProviderBindingDraftNode,
): string | null {
  if (!isWorkflowProviderBindingNodeType(node.type)) return null;
  return readWorkflowProviderAccountId(node.data ?? {});
}

export async function assertWorkflowProviderBindingsCanBeSaved(input: {
  nodes: readonly WorkflowProviderBindingDraftNode[];
  organizationId: string;
  locationId: string | null;
}): Promise<void> {
  const bindings = input.nodes.flatMap((node) => {
    if (!isWorkflowProviderBindingNodeType(node.type)) return [];
    const providerAccountId = readWorkflowProviderAccountId(node.data ?? {});
    if (!providerAccountId) return [];
    return [
      {
        providerAccountId,
        spec: getWorkflowProviderBindingSpec(node.type),
      },
    ];
  });
  const accountIds = [
    ...new Set(bindings.map((binding) => binding.providerAccountId)),
  ];
  if (accountIds.length === 0) return;

  const rows = await db
    .select({
      id: providerAccount.id,
      organizationId: providerAccount.organizationId,
      locationId: providerAccount.locationId,
      provider: providerAccount.provider,
      config: providerAccount.config,
    })
    .from(providerAccount)
    .where(
      and(
        eq(providerAccount.organizationId, input.organizationId),
        inArray(providerAccount.id, accountIds),
      ),
    );
  const accountById = new Map(rows.map((row) => [row.id, row]));

  const invalid = bindings.some((binding) => {
    const account = accountById.get(binding.providerAccountId);
    if (!account || account.provider !== binding.spec.provider) return true;
    const config = oauthProviderConfigSchema.safeParse(account.config);
    return !providerAccountMatchesScope(
      {
        organizationId: account.organizationId,
        locationId: account.locationId,
        inheritToLocations: config.success
          ? config.data.inheritToLocations
          : false,
      },
      {
        organizationId: input.organizationId,
        locationId: input.locationId,
      },
    );
  });

  if (invalid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Reconnect provider-backed nodes to accounts available in this workspace.",
    });
  }
}
