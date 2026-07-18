import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  client,
  communicationSuppression,
  outboundDelivery,
  smsConfig,
  smsMessage,
} from "@/db/schema";
import type { DeliveryPurpose } from "@/features/delivery/contracts";
import { normalizePhoneDestination } from "@/features/delivery/lib/normalization";
import { requestDeliveryDispatch } from "@/features/delivery/server/request-dispatch";
import { requireCommunicationEntitlement } from "@/features/communications/server/profile-service";
import { resolveSmsSender } from "@/features/sms/server/sms-sender";
import { reserveSmsSpend } from "@/features/communications/server/sms-spend-policy";
import { isSmsDestinationAllowed } from "@/features/communications/lib/sms-destination-policy";

const INSERT_BATCH_SIZE = 250;

type SmsRecipient = {
  to: string;
  clientId?: string;
};

type EnqueueSmsInput = {
  organizationId: string;
  locationId: string | null;
  recipients: readonly SmsRecipient[];
  body: string;
  purpose: Extract<DeliveryPurpose, "MARKETING" | "ONE_TO_ONE">;
  idempotencyKey?: string;
};

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function enqueueSmsMessages(input: EnqueueSmsInput) {
  if (
    input.idempotencyKey !== undefined &&
    (input.idempotencyKey.length === 0 || input.idempotencyKey.length > 180)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "SMS idempotency key must contain between 1 and 180 characters",
    });
  }
  const profile = await requireCommunicationEntitlement({
    organizationId: input.organizationId,
    channel: "SMS",
  });
  const config = await resolveSmsSender({
    organizationId: input.organizationId,
    locationId: input.locationId,
  });
  if (!config?.isActive) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "SMS is not configured for this organization",
    });
  }

  const clientIds = [
    ...new Set(
      input.recipients.flatMap((recipient) =>
        recipient.clientId ? [recipient.clientId] : [],
      ),
    ),
  ];
  if (clientIds.length > 0) {
    const ownedClients = await db
      .select({ id: client.id })
      .from(client)
      .where(
        and(
          inArray(client.id, clientIds),
          eq(client.organizationId, input.organizationId),
          input.locationId
            ? eq(client.locationId, input.locationId)
            : isNull(client.locationId),
        ),
      );
    if (ownedClients.length !== clientIds.length) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "One or more SMS recipients are outside the active workspace",
      });
    }
  }

  const prepared = input.recipients.map((recipient, index) => {
    const messageId = createId();
    return {
      messageId,
      deliveryId: createId(),
      idempotencyKey: input.idempotencyKey
        ? `sms:${input.idempotencyKey}:${index}`
        : `sms-message:${messageId}`,
      clientId: recipient.clientId ?? null,
      to: recipient.to,
      destinationNormalized: normalizePhoneDestination(recipient.to),
    };
  });
  const disallowedDestination = prepared.find(
    (recipient) =>
      !isSmsDestinationAllowed(
        recipient.destinationNormalized,
        profile.allowedSmsCountries,
      ),
  );
  if (disallowedDestination) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "One or more SMS destinations are outside the countries allowed by the workspace SMS policy.",
    });
  }
  const result = await db.transaction(async (tx) => {
    const now = new Date();
    const locationScope = input.locationId
      ? or(
          isNull(communicationSuppression.locationId),
          eq(communicationSuppression.locationId, input.locationId),
        )
      : isNull(communicationSuppression.locationId);
    const suppressions = await tx
      .select({
        destinationNormalized: communicationSuppression.destinationNormalized,
        reason: communicationSuppression.reason,
      })
      .from(communicationSuppression)
      .where(
        and(
          eq(communicationSuppression.organizationId, input.organizationId),
          locationScope,
          eq(communicationSuppression.channel, "SMS"),
          inArray(
            communicationSuppression.destinationNormalized,
            prepared.map((recipient) => recipient.destinationNormalized),
          ),
          lte(communicationSuppression.activeAt, now),
          isNull(communicationSuppression.revokedAt),
          or(
            isNull(communicationSuppression.expiresAt),
            gt(communicationSuppression.expiresAt, now),
          ),
          input.purpose === "MARKETING"
            ? undefined
            : eq(communicationSuppression.scope, "ALL"),
        ),
      );
    const suppressionByDestination = new Map(
      suppressions.map((suppression) => [
        suppression.destinationNormalized,
        suppression.reason,
      ]),
    );
    const insertedDeliveryIds = new Set<string>();
    for (const batch of chunk(prepared, INSERT_BATCH_SIZE)) {
      const inserted = await tx
        .insert(outboundDelivery)
        .values(
          batch.map((recipient) => {
            const suppressionReason = suppressionByDestination.get(
              recipient.destinationNormalized,
            );
            return {
              id: recipient.deliveryId,
              organizationId: input.organizationId,
              locationId: input.locationId,
              clientId: recipient.clientId,
              channel: "SMS" as const,
              purpose: input.purpose,
              provider: config.provider,
              providerAccountId: config.providerAccountId,
              status: suppressionReason
                ? ("SUPPRESSED" as const)
                : ("QUEUED" as const),
              providerAccountRef: config.id,
              sourceType: "SMS_MESSAGE",
              sourceId: recipient.messageId,
              destination: recipient.to,
              destinationNormalized: recipient.destinationNormalized,
              senderRef: { kind: config.kind, id: config.id },
              payload: { channel: "SMS" as const, body: input.body },
              idempotencyKey: recipient.idempotencyKey,
              availableAt: now,
              maxAttempts: 5,
              lastErrorCode: suppressionReason ?? null,
              lastErrorMessage: suppressionReason
                ? "SMS blocked by an active communication suppression"
                : null,
              updatedAt: now,
            };
          }),
        )
        .onConflictDoNothing({
          target: [
            outboundDelivery.organizationId,
            outboundDelivery.idempotencyKey,
          ],
        })
        .returning({ id: outboundDelivery.id });
      for (const row of inserted) insertedDeliveryIds.add(row.id);
    }

    const persisted =
      prepared.length === 0
        ? []
        : await tx
            .select({
              id: outboundDelivery.id,
              locationId: outboundDelivery.locationId,
              sourceType: outboundDelivery.sourceType,
              sourceId: outboundDelivery.sourceId,
              destinationNormalized: outboundDelivery.destinationNormalized,
              purpose: outboundDelivery.purpose,
              provider: outboundDelivery.provider,
              payload: outboundDelivery.payload,
              status: outboundDelivery.status,
              idempotencyKey: outboundDelivery.idempotencyKey,
            })
            .from(outboundDelivery)
            .where(
              and(
                eq(outboundDelivery.organizationId, input.organizationId),
                inArray(
                  outboundDelivery.idempotencyKey,
                  prepared.map((recipient) => recipient.idempotencyKey),
                ),
              ),
            );
    const persistedByKey = new Map(
      persisted.map((delivery) => [delivery.idempotencyKey, delivery]),
    );
    for (const recipient of prepared) {
      const delivery = persistedByKey.get(recipient.idempotencyKey);
      if (
        !delivery ||
        delivery.locationId !== input.locationId ||
        delivery.sourceType !== "SMS_MESSAGE" ||
        delivery.destinationNormalized !== recipient.destinationNormalized ||
        delivery.purpose !== input.purpose ||
        delivery.provider !== config.provider ||
        !smsPayloadMatches(delivery.payload, input.body)
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "The SMS idempotency key is already assigned to different content",
        });
      }
    }

    const newlyQueued = persisted.filter(
      (delivery) =>
        insertedDeliveryIds.has(delivery.id) && delivery.status === "QUEUED",
    ).length;
    const preparedByKey = new Map(
      prepared.map((recipient) => [recipient.idempotencyKey, recipient]),
    );
    if (newlyQueued > 0 && config.kind === "SMS_CONFIG") {
      const [reserved] = await tx
        .update(smsConfig)
        .set({
          sentThisMonth: sql`${smsConfig.sentThisMonth} + ${newlyQueued}`,
          updatedAt: now,
        })
        .where(
          and(
            eq(smsConfig.id, config.id),
            eq(smsConfig.isActive, true),
            sql`${smsConfig.sentThisMonth} + ${newlyQueued} <= ${smsConfig.monthlyLimit}`,
          ),
        )
        .returning({ id: smsConfig.id });
      if (!reserved) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "The monthly SMS limit would be exceeded",
        });
      }
    }
    if (newlyQueued > 0 && config.kind === "TWILIO_PHONE_NUMBER") {
      await reserveSmsSpend({
        tx,
        organizationId: input.organizationId,
        locationId: input.locationId,
        providerAccountId: config.providerAccountId,
        phoneNumberId: config.id,
        deliveries: persisted
          .filter(
            (delivery) =>
              insertedDeliveryIds.has(delivery.id) &&
              delivery.status === "QUEUED",
          )
          .map((delivery) => ({
            id: delivery.id,
            clientId:
              preparedByKey.get(delivery.idempotencyKey)?.clientId ?? null,
          })),
        body: input.body,
        at: now,
      });
    }

    const insertedDeliveries = persisted.filter((delivery) =>
      insertedDeliveryIds.has(delivery.id),
    );
    for (const batch of chunk(insertedDeliveries, INSERT_BATCH_SIZE)) {
      await tx.insert(smsMessage).values(
        batch.map((delivery) => {
          const recipient = preparedByKey.get(delivery.idempotencyKey);
          if (!recipient) {
            throw new Error("Inserted SMS delivery has no prepared recipient");
          }
          const suppressed = delivery.status === "SUPPRESSED";
          return {
            id: delivery.sourceId,
            organizationId: input.organizationId,
            locationId: input.locationId,
            clientId: recipient.clientId,
            to: recipient.destinationNormalized,
            from: config.fromNumber,
            body: input.body,
            direction: "OUTBOUND" as const,
            status: suppressed ? ("FAILED" as const) : ("QUEUED" as const),
            errorCode: suppressed
              ? suppressionByDestination.get(recipient.destinationNormalized)
              : null,
            errorMessage: suppressed ? "SMS suppressed" : null,
            deliveryId: delivery.id,
          };
        }),
      );
    }

    const orderedDeliveries = prepared.map((recipient) => {
      const delivery = persistedByKey.get(recipient.idempotencyKey);
      if (!delivery) throw new Error("SMS delivery was not persisted");
      return delivery;
    });
    return {
      messageIds: orderedDeliveries.map((delivery) => delivery.sourceId),
      queued: orderedDeliveries.filter(
        (delivery) => delivery.status !== "SUPPRESSED",
      ).length,
      suppressed: orderedDeliveries.filter(
        (delivery) => delivery.status === "SUPPRESSED",
      ).length,
      newlyQueued,
    };
  });

  if (result.newlyQueued > 0) {
    await requestDeliveryDispatch(input.organizationId);
  }
  const { newlyQueued: _newlyQueued, ...publicResult } = result;
  return publicResult;
}

function smsPayloadMatches(payload: unknown, body: string): boolean {
  if (
    typeof payload !== "object" ||
    payload === null ||
    Array.isArray(payload)
  ) {
    return false;
  }
  return (
    "channel" in payload &&
    "body" in payload &&
    payload.channel === "SMS" &&
    payload.body === body
  );
}
