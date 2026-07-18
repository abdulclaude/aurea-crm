import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { db } from "@/db";
import {
  communicationServiceProfile,
  communicationUsageLedger,
} from "@/db/schema";
import type { DeliveryTransaction } from "@/features/delivery/server/outbox";
import { conservativeSmsSegmentUpperBound } from "@/features/communications/lib/policy";

const reservationAmountSchema = z
  .string()
  .regex(/^\d+(?:\.\d{1,4})?$/)
  .refine((value) => value !== "0" && value !== "0.0" && value !== "0.00");

export function smsSegmentReservationAmount(): string | null {
  const parsed = reservationAmountSchema.safeParse(
    process.env.AUREA_TWILIO_SMS_SEGMENT_RESERVATION_AMOUNT,
  );
  return parsed.success ? parsed.data : null;
}

export { conservativeSmsSegmentUpperBound } from "@/features/communications/lib/policy";

function period(at: Date): string {
  return at.toISOString().slice(0, 7);
}

export async function reserveSmsSpend(input: {
  tx: DeliveryTransaction;
  organizationId: string;
  locationId: string | null;
  providerAccountId: string;
  phoneNumberId: string;
  deliveries: readonly { id: string; clientId: string | null }[];
  body: string;
  at: Date;
}): Promise<void> {
  if (input.deliveries.length === 0) return;
  const amount = smsSegmentReservationAmount();
  if (!amount) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "SMS sending is disabled until a platform segment reservation amount is configured.",
    });
  }
  const [profile] = await input.tx
    .select({
      limit: communicationServiceProfile.smsMonthlySpendLimit,
      currency: communicationServiceProfile.spendCurrency,
    })
    .from(communicationServiceProfile)
    .where(eq(communicationServiceProfile.organizationId, input.organizationId))
    .limit(1);
  if (!profile?.limit) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Set an SMS monthly spend limit before sending from a managed number.",
    });
  }
  const billingPeriod = period(input.at);
  await input.tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${`${input.organizationId}:SMS:${billingPeriod}`}))`,
  );
  const segments = conservativeSmsSegmentUpperBound(input.body);
  const requestedUnits = segments * input.deliveries.length;
  const [budget] = await input.tx
    .select({
      permitted: sql<boolean>`(
        coalesce(sum(CASE
          WHEN ${communicationUsageLedger.entryKind} = 'RELEASE'
            THEN -${communicationUsageLedger.customerCharge}
          ELSE ${communicationUsageLedger.customerCharge}
        END), 0)
        + (${amount}::numeric * ${requestedUnits})
      ) <= ${profile.limit}::numeric`,
    })
    .from(communicationUsageLedger)
    .where(
      and(
        eq(communicationUsageLedger.organizationId, input.organizationId),
        eq(communicationUsageLedger.billingPeriod, billingPeriod),
        eq(communicationUsageLedger.currency, profile.currency),
        eq(communicationUsageLedger.resourceType, "SMS_SEGMENT"),
      ),
    );
  if (!budget?.permitted) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "The SMS monthly spend limit would be exceeded.",
    });
  }
  await input.tx
    .insert(communicationUsageLedger)
    .values(
      input.deliveries.map((delivery) => ({
        id: createId(),
        organizationId: input.organizationId,
        locationId: input.locationId,
        clientId: delivery.clientId,
        provider: "TWILIO" as const,
        providerAccountId: input.providerAccountId,
        phoneNumberId: input.phoneNumberId,
        deliveryId: delivery.id,
        entryKind: "RESERVATION" as const,
        resourceType: "SMS_SEGMENT" as const,
        idempotencyKey: `twilio:sms:${delivery.id}:reservation`,
        quantity: String(segments),
        unit: "segment",
        providerCost: "0",
        customerCharge: sql`${amount}::numeric * ${segments}`,
        currency: profile.currency,
        occurredAt: input.at,
        billingPeriod,
        metadata: { conservativeUpperBound: true },
      })),
    )
    .onConflictDoNothing();
}

export async function checkSmsSpendAtDispatch(input: {
  organizationId: string;
  deliveryId: string;
}): Promise<boolean> {
  const [result] = await db
    .select({
      permitted: sql<boolean>`${communicationServiceProfile.smsMonthlySpendLimit} IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM "CommunicationUsageLedger" AS reservation
          WHERE reservation."organizationId" = ${input.organizationId}
            AND reservation."deliveryId" = ${input.deliveryId}
            AND reservation."entryKind" = 'RESERVATION'
        )
        AND (
          SELECT coalesce(sum(CASE
            WHEN ledger."entryKind" = 'RELEASE' THEN -ledger."customerCharge"
            ELSE ledger."customerCharge"
          END), 0)
          FROM "CommunicationUsageLedger" AS ledger
          WHERE ledger."organizationId" = ${input.organizationId}
            AND ledger."billingPeriod" = to_char(CURRENT_TIMESTAMP, 'YYYY-MM')
            AND ledger."currency" = ${communicationServiceProfile.spendCurrency}
        ) <= ${communicationServiceProfile.smsMonthlySpendLimit}`,
    })
    .from(communicationServiceProfile)
    .where(eq(communicationServiceProfile.organizationId, input.organizationId))
    .limit(1);
  return result?.permitted ?? false;
}

export async function releaseSmsSpendReservation(input: {
  tx: DeliveryTransaction;
  organizationId: string;
  deliveryId: string;
  reason: string;
  at: Date;
}): Promise<void> {
  const [reservation] = await input.tx
    .select()
    .from(communicationUsageLedger)
    .where(
      and(
        eq(communicationUsageLedger.organizationId, input.organizationId),
        eq(communicationUsageLedger.deliveryId, input.deliveryId),
        eq(communicationUsageLedger.entryKind, "RESERVATION"),
      ),
    )
    .limit(1);
  if (!reservation) return;
  await input.tx
    .insert(communicationUsageLedger)
    .values({
      id: createId(),
      organizationId: reservation.organizationId,
      locationId: reservation.locationId,
      clientId: reservation.clientId,
      provider: "TWILIO",
      providerAccountId: reservation.providerAccountId,
      phoneNumberId: reservation.phoneNumberId,
      deliveryId: reservation.deliveryId,
      entryKind: "RELEASE",
      resourceType: "SMS_SEGMENT",
      idempotencyKey: `twilio:sms:${input.deliveryId}:reservation-release`,
      quantity: reservation.quantity,
      unit: reservation.unit,
      providerCost: "0",
      customerCharge: reservation.customerCharge,
      currency: reservation.currency,
      occurredAt: input.at,
      billingPeriod: reservation.billingPeriod,
      metadata: { reason: input.reason },
    })
    .onConflictDoNothing();
}
