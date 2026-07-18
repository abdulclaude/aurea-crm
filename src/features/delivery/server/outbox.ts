import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { and, eq, gt, isNull, lte, or } from "drizzle-orm";

import { db } from "@/db";
import {
  client,
  communicationSuppression,
  outboundDelivery,
} from "@/db/schema";
import type {
  CommunicationSuppressionScope,
  DeliveryChannel,
  DeliveryPurpose,
} from "@/features/delivery/contracts";
import { normalizeDeliveryDestination } from "@/features/delivery/lib/normalization";
import {
  enqueueDeliveryInputSchema,
  type EnqueueDeliveryInput,
} from "@/features/delivery/lib/payload-schemas";

export type DeliveryTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export type BlockingSuppression = {
  id: string;
  reason: string;
  scope: CommunicationSuppressionScope;
};

type SuppressionLookupInput = {
  organizationId: string;
  locationId: string | null;
  clientId: string | null;
  channel: DeliveryChannel;
  purpose: DeliveryPurpose;
  destinationNormalized: string;
  at?: Date;
};

export async function findBlockingSuppressionInTransaction(
  tx: DeliveryTransaction,
  input: SuppressionLookupInput,
): Promise<BlockingSuppression | null> {
  const at = input.at ?? new Date();
  const locationScope = input.locationId
    ? or(
        isNull(communicationSuppression.locationId),
        eq(communicationSuppression.locationId, input.locationId),
      )
    : isNull(communicationSuppression.locationId);

  const [suppression] = await tx
    .select({
      id: communicationSuppression.id,
      reason: communicationSuppression.reason,
      scope: communicationSuppression.scope,
    })
    .from(communicationSuppression)
    .where(
      and(
        eq(communicationSuppression.organizationId, input.organizationId),
        locationScope,
        eq(communicationSuppression.channel, input.channel),
        eq(
          communicationSuppression.destinationNormalized,
          input.destinationNormalized,
        ),
        lte(communicationSuppression.activeAt, at),
        isNull(communicationSuppression.revokedAt),
        or(
          isNull(communicationSuppression.expiresAt),
          gt(communicationSuppression.expiresAt, at),
        ),
        input.purpose === "MARKETING"
          ? undefined
          : eq(communicationSuppression.scope, "ALL"),
      ),
    )
    .limit(1);

  if (suppression) {
    return suppression;
  }

  if (
    input.channel !== "EMAIL" ||
    input.purpose !== "MARKETING" ||
    !input.clientId
  ) {
    return null;
  }

  const [legacyUnsubscribe] = await tx
    .select({ id: client.id })
    .from(client)
    .where(
      and(
        eq(client.id, input.clientId),
        eq(client.organizationId, input.organizationId),
        input.locationId
          ? eq(client.locationId, input.locationId)
          : isNull(client.locationId),
        eq(client.emailUnsubscribed, true),
      ),
    )
    .limit(1);

  return legacyUnsubscribe
    ? { id: legacyUnsubscribe.id, reason: "UNSUBSCRIBE", scope: "MARKETING" }
    : null;
}

export type EnqueueDeliveryResult = {
  delivery: typeof outboundDelivery.$inferSelect;
  suppression: BlockingSuppression | null;
};

export async function enqueueDeliveryInTransaction(
  tx: DeliveryTransaction,
  input: EnqueueDeliveryInput,
): Promise<EnqueueDeliveryResult> {
  const parsed = enqueueDeliveryInputSchema.parse(input);
  const destinationNormalized = normalizeDeliveryDestination(
    parsed.channel,
    parsed.destination,
  );
  const suppression = await findBlockingSuppressionInTransaction(tx, {
    organizationId: parsed.organizationId,
    locationId: parsed.locationId,
    clientId: parsed.clientId,
    channel: parsed.channel,
    purpose: parsed.purpose,
    destinationNormalized,
  });
  const now = new Date();

  const [insertedDelivery] = await tx
    .insert(outboundDelivery)
    .values({
      id: createId(),
      organizationId: parsed.organizationId,
      locationId: parsed.locationId,
      clientId: parsed.clientId,
      channel: parsed.channel,
      purpose: parsed.purpose,
      provider: parsed.provider,
      status: suppression ? "SUPPRESSED" : "QUEUED",
      providerAccountId:
        parsed.providerAccountId ??
        (parsed.provider === "RESEND" ? parsed.providerAccountRef : null),
      providerAccountRef: parsed.providerAccountRef,
      sourceType: parsed.sourceType,
      sourceId: parsed.sourceId,
      destination: parsed.destination,
      destinationNormalized,
      senderRef: parsed.sender,
      communicationRuleId: parsed.communicationRule?.ruleId ?? null,
      communicationRuleVersionId: parsed.communicationRule?.versionId ?? null,
      communicationRuleSnapshot: parsed.communicationRule?.snapshot ?? null,
      payload: parsed.payload,
      idempotencyKey: parsed.idempotencyKey,
      availableAt: parsed.availableAt ?? now,
      maxAttempts: parsed.maxAttempts,
      lastErrorCode: suppression ? suppression.reason : null,
      lastErrorMessage: suppression
        ? "Delivery blocked by an active communication suppression"
        : null,
      updatedAt: now,
    })
    .onConflictDoNothing({
      target: [
        outboundDelivery.organizationId,
        outboundDelivery.idempotencyKey,
      ],
    })
    .returning();

  if (insertedDelivery) {
    return { delivery: insertedDelivery, suppression };
  }

  const [existingDelivery] = await tx
    .select()
    .from(outboundDelivery)
    .where(
      and(
        eq(outboundDelivery.organizationId, parsed.organizationId),
        eq(outboundDelivery.idempotencyKey, parsed.idempotencyKey),
      ),
    )
    .limit(1);
  if (!existingDelivery) {
    throw new Error("Failed to enqueue outbound delivery");
  }
  if (
    existingDelivery.channel !== parsed.channel ||
    existingDelivery.provider !== parsed.provider ||
    existingDelivery.sourceType !== parsed.sourceType ||
    existingDelivery.sourceId !== parsed.sourceId ||
    existingDelivery.destinationNormalized !== destinationNormalized
  ) {
    throw new Error(
      "The delivery idempotency key is already assigned to different content",
    );
  }

  return { delivery: existingDelivery, suppression: null };
}
