import "server-only";

import { TRPCError } from "@trpc/server";

import type { EmailAttachmentReference } from "@/features/delivery/lib/payload-schemas";
import { enqueueEmail } from "@/features/delivery/server/transactional-email";
import { renderCommunicationRuleContent } from "../lib/rule-rendering";
import { resolveCommunicationRule } from "./rule-service";

export type EnqueueConfiguredTransactionalEmailInput = {
  organizationId: string;
  locationId: string | null;
  clientId: string | null;
  eventKey: string;
  sourceType: string;
  sourceId: string;
  idempotencyKey: string;
  to: string;
  variables: Readonly<Record<string, string>>;
  fallback: {
    subject: string;
    html?: string;
    text?: string;
  };
  attachments?: EmailAttachmentReference[];
  emailDomainId?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  replyTo?: string | null;
  availableAt?: Date;
};

export async function enqueueConfiguredTransactionalEmail(
  input: EnqueueConfiguredTransactionalEmailInput,
) {
  const rule = await resolveCommunicationRule({
    organizationId: input.organizationId,
    locationId: input.locationId,
    eventKey: input.eventKey,
    channel: "EMAIL",
    at: input.availableAt,
    includeDisabled: true,
  });
  if (rule && !rule.isEnabled) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Transactional email is disabled by the ${input.eventKey} communication rule.`,
    });
  }
  if (rule && !["TRANSACTIONAL", "SYSTEM"].includes(rule.purpose)) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `The ${input.eventKey} rule must use a transactional or system purpose.`,
    });
  }
  const rendered = rule
    ? renderCommunicationRuleContent({
        subject: rule.subject,
        textBody: rule.textBody,
        htmlBody: rule.htmlBody,
        variables: input.variables,
      })
    : {
        subject: input.fallback.subject,
        textBody: input.fallback.text ?? null,
        htmlBody: input.fallback.html ?? null,
      };
  if (!rendered.subject || (!rendered.htmlBody && !rendered.textBody)) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `The ${input.eventKey} communication rule has no deliverable email content.`,
    });
  }
  return enqueueEmail({
    organizationId: input.organizationId,
    locationId: input.locationId,
    clientId: input.clientId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    idempotencyKey: input.idempotencyKey,
    to: input.to,
    subject: rendered.subject,
    html: rendered.htmlBody ?? undefined,
    text: rendered.textBody ?? undefined,
    purpose: rule?.purpose ?? "TRANSACTIONAL",
    emailDomainId: input.emailDomainId,
    fromName: input.fromName,
    fromEmail: input.fromEmail,
    replyTo: input.replyTo,
    attachments: input.attachments,
    availableAt: rule?.scheduledFor ?? input.availableAt,
    communicationRule: rule
      ? {
          ruleId: rule.id,
          versionId: rule.versionId,
          snapshot: rule.immutableSnapshot,
        }
      : undefined,
  });
}
