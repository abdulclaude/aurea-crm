import "server-only";

import { TRPCError } from "@trpc/server";

import { db } from "@/db";
import { outboundDelivery } from "@/db/schema";
import { emailDeliveryPayloadSchema } from "@/features/delivery/lib/payload-schemas";
import type { EmailAttachmentReference } from "@/features/delivery/lib/payload-schemas";
import { resolveEmailSender } from "@/features/delivery/server/email-sender";
import { enqueueDeliveryInTransaction } from "@/features/delivery/server/outbox";
import { requestDeliveryDispatch } from "@/features/delivery/server/request-dispatch";
import { protectEmailContent } from "@/features/delivery/server/protected-email-content";
import type { DeliveryPurpose } from "@/features/delivery/contracts";
import type { CommunicationRuleSnapshot } from "@/features/communications/contracts";

export type EnqueueTransactionalEmailInput = {
  organizationId: string;
  locationId: string | null;
  clientId: string | null;
  sourceType: string;
  sourceId: string;
  idempotencyKey: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  emailDomainId?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  replyTo?: string | null;
  attachments?: EmailAttachmentReference[];
  protectContent?: boolean;
  availableAt?: Date;
  communicationRule?: {
    ruleId: string;
    versionId: string;
    snapshot: CommunicationRuleSnapshot;
  };
};

export type EnqueueEmailInput = EnqueueTransactionalEmailInput & {
  purpose: DeliveryPurpose;
};

export async function enqueueEmail(
  input: EnqueueEmailInput,
): Promise<typeof outboundDelivery.$inferSelect> {
  return enqueueEmailWithPurpose(input);
}

export async function enqueueTransactionalEmail(
  input: EnqueueTransactionalEmailInput,
): Promise<typeof outboundDelivery.$inferSelect> {
  return enqueueEmailWithPurpose({ ...input, purpose: "TRANSACTIONAL" });
}

async function enqueueEmailWithPurpose(
  input: EnqueueEmailInput,
): Promise<typeof outboundDelivery.$inferSelect> {
  const resolvedSender = await resolveEmailSender(input);
  const content =
    input.protectContent !== false
      ? protectEmailContent({ html: input.html, text: input.text })
      : { html: input.html, text: input.text };
  const parsedPayload = emailDeliveryPayloadSchema.safeParse({
    channel: "EMAIL",
    subject: input.subject,
    ...content,
    replyTo: input.replyTo ?? undefined,
    attachments: input.attachments,
  });
  if (!parsedPayload.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Transactional email requires a valid subject and HTML or text body.",
    });
  }
  const result = await db.transaction((tx) =>
    enqueueDeliveryInTransaction(tx, {
      organizationId: input.organizationId,
      locationId: input.locationId,
      clientId: input.clientId,
      channel: "EMAIL",
      purpose: input.purpose,
      provider: "RESEND",
      providerAccountId: resolvedSender.providerAccountRef,
      providerAccountRef: resolvedSender.providerAccountRef,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      destination: input.to,
      sender: resolvedSender.sender,
      communicationRule: input.communicationRule,
      payload: parsedPayload.data,
      idempotencyKey: input.idempotencyKey,
      availableAt: input.availableAt,
      maxAttempts: 5,
    }),
  );

  if (result.delivery.status === "QUEUED" && !result.suppression) {
    await requestDeliveryDispatch(input.organizationId);
  }

  return result.delivery;
}
