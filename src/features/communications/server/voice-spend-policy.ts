import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import type { DeliveryTransaction } from "@/features/delivery/server/outbox";
import {
  communicationServiceProfile,
  communicationUsageLedger,
} from "@/db/schema";
import { db } from "@/db";

const rateSchema = z.string().regex(/^\d+(?:\.\d{1,4})?$/);

export function voiceMinuteReservationAmount(): string | null {
  const parsed = rateSchema.safeParse(
    process.env.AUREA_TWILIO_VOICE_MINUTE_RESERVATION_AMOUNT,
  );
  return parsed.success && !/^0+(?:\.0+)?$/.test(parsed.data)
    ? parsed.data
    : null;
}

function billingPeriod(at: Date): string {
  return at.toISOString().slice(0, 7);
}

export async function reserveVoiceSpend(input: {
  tx: DeliveryTransaction;
  organizationId: string;
  locationId: string | null;
  clientId: string | null;
  providerAccountId: string;
  phoneNumberId: string;
  voiceCallId: string;
  at: Date;
}): Promise<{ maxDurationSeconds: number; currency: string }> {
  const rate = voiceMinuteReservationAmount();
  if (!rate) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Voice calling is disabled until a platform minute reservation amount is configured.",
    });
  }
  const [profile] = await input.tx
    .select({
      limit: communicationServiceProfile.voiceMonthlySpendLimit,
      maxDurationSeconds:
        communicationServiceProfile.voiceMaxCallDurationSeconds,
      currency: communicationServiceProfile.spendCurrency,
    })
    .from(communicationServiceProfile)
    .where(eq(communicationServiceProfile.organizationId, input.organizationId))
    .limit(1);
  if (!profile?.limit || !profile.maxDurationSeconds) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Set both a voice monthly spend limit and maximum call duration before placing calls.",
    });
  }

  const period = billingPeriod(input.at);
  await input.tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${`${input.organizationId}:VOICE:${period}`}))`,
  );
  const [budget] = await input.tx
    .select({
      permitted: sql<boolean>`(
        coalesce(sum(CASE
          WHEN ${communicationUsageLedger.entryKind} = 'RELEASE'
            THEN -${communicationUsageLedger.customerCharge}
          ELSE ${communicationUsageLedger.customerCharge}
        END), 0)
        + (${rate}::numeric * ceil(${profile.maxDurationSeconds}::numeric / 60))
      ) <= ${profile.limit}::numeric`,
    })
    .from(communicationUsageLedger)
    .where(
      and(
        eq(communicationUsageLedger.organizationId, input.organizationId),
        eq(communicationUsageLedger.billingPeriod, period),
        eq(communicationUsageLedger.currency, profile.currency),
        eq(communicationUsageLedger.resourceType, "VOICE_SECOND"),
      ),
    );
  if (!budget?.permitted) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "The voice monthly spend limit would be exceeded.",
    });
  }

  await input.tx
    .insert(communicationUsageLedger)
    .values({
      id: createId(),
      organizationId: input.organizationId,
      locationId: input.locationId,
      clientId: input.clientId,
      provider: "TWILIO",
      providerAccountId: input.providerAccountId,
      phoneNumberId: input.phoneNumberId,
      voiceCallId: input.voiceCallId,
      entryKind: "RESERVATION",
      resourceType: "VOICE_SECOND",
      idempotencyKey: `twilio:voice:${input.voiceCallId}:reservation`,
      quantity: String(profile.maxDurationSeconds),
      unit: "second",
      providerCost: "0",
      customerCharge: sql`${rate}::numeric * ceil(${profile.maxDurationSeconds}::numeric / 60)`,
      currency: profile.currency,
      occurredAt: input.at,
      billingPeriod: period,
      metadata: { conservativeUpperBound: true },
    })
    .onConflictDoNothing();

  return {
    maxDurationSeconds: profile.maxDurationSeconds,
    currency: profile.currency,
  };
}

export async function releaseVoiceSpendReservation(input: {
  tx: DeliveryTransaction;
  organizationId: string;
  voiceCallId: string;
  reason: string;
  at: Date;
}): Promise<void> {
  const [reservation] = await input.tx
    .select()
    .from(communicationUsageLedger)
    .where(
      and(
        eq(communicationUsageLedger.organizationId, input.organizationId),
        eq(communicationUsageLedger.voiceCallId, input.voiceCallId),
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
      voiceCallId: input.voiceCallId,
      entryKind: "RELEASE",
      resourceType: "VOICE_SECOND",
      idempotencyKey: `twilio:voice:${input.voiceCallId}:reservation-release`,
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

export async function isVoiceSpendAvailable(
  organizationId: string,
  at: Date = new Date(),
): Promise<boolean> {
  const [result] = await db
    .select({
      permitted: sql<boolean>`${communicationServiceProfile.voiceMonthlySpendLimit} IS NOT NULL
        AND coalesce((
          SELECT sum(CASE
            WHEN voice_usage."entryKind" = 'RELEASE' THEN -voice_usage."customerCharge"
            ELSE voice_usage."customerCharge"
          END)
          FROM "CommunicationUsageLedger" AS voice_usage
          WHERE voice_usage."organizationId" = ${organizationId}
            AND voice_usage."billingPeriod" = ${billingPeriod(at)}
            AND voice_usage."currency" = ${communicationServiceProfile.spendCurrency}
        ), 0) < ${communicationServiceProfile.voiceMonthlySpendLimit}`,
    })
    .from(communicationServiceProfile)
    .where(eq(communicationServiceProfile.organizationId, organizationId))
    .limit(1);
  return result?.permitted ?? false;
}
