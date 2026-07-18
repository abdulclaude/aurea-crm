import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { and, eq, inArray, isNotNull, isNull, lte } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { communicationUsageLedger, voiceCall } from "@/db/schema";
import { projectVoiceStatus } from "@/features/communications/lib/policy";
import { resolveTwilioPlatformAccount } from "./twilio-client";
import { applyTwilioVoiceStatus } from "./twilio-voice-application";
import { releaseVoiceSpendReservation } from "./voice-spend-policy";

const providerPriceSchema = z.string().regex(/^-?\d+(?:\.\d{1,6})?$/);
const providerCurrencySchema = z.string().regex(/^[A-Za-z]{3}$/);

function billingPeriod(at: Date): string {
  return at.toISOString().slice(0, 7);
}

const AMBIGUOUS_CALL_SETTLE_MS = 15 * 60_000;

export async function reconcileAmbiguousVoiceCalls(): Promise<number> {
  const calls = await db
    .select()
    .from(voiceCall)
    .where(
      and(
        eq(voiceCall.status, "FAILED"),
        inArray(voiceCall.failureCode, [
          "TWILIO_CALL_CREATE_AMBIGUOUS",
          "TWILIO_CALL_RECONCILIATION_REQUIRED",
        ]),
        isNull(voiceCall.providerCallId),
      ),
    )
    .limit(25);
  let reconciled = 0;
  for (const call of calls) {
    if (!call.forwardingNumber) continue;
    const binding = await resolveTwilioPlatformAccount({
      organizationId: call.organizationId,
    });
    if (!binding.client || binding.account.id !== call.providerAccountId) {
      continue;
    }
    const remoteCalls = await binding.client.calls.list({
      from: call.fromNumber,
      to: call.forwardingNumber,
      startTimeAfter: new Date(call.createdAt.getTime() - 24 * 60 * 60_000),
      limit: 100,
    });
    const earliest = call.createdAt.getTime() - 10_000;
    const latest = call.createdAt.getTime() + 2 * 60_000;
    const candidates = remoteCalls.filter((remote) => {
      const createdAt = remote.dateCreated?.getTime();
      return (
        createdAt !== undefined && createdAt >= earliest && createdAt <= latest
      );
    });
    if (candidates.length === 1) {
      const [remote] = candidates;
      if (!remote) continue;
      await db
        .update(voiceCall)
        .set({
          providerCallId: remote.sid,
          status: projectVoiceStatus(remote.status),
          startedAt: remote.dateCreated ?? call.startedAt,
          failureCode: null,
          failureMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(voiceCall.id, call.id));
      await applyTwilioVoiceStatus({
        providerEventId: `reconcile:${remote.sid}:${remote.status}`,
        providerAccountId: call.providerAccountId,
        organizationId: call.organizationId,
        occurredAt: remote.endTime ?? remote.dateUpdated ?? new Date(),
        event: {
          AccountSid: remote.accountSid,
          CallSid: remote.sid,
          CallStatus: remote.status,
          CallDuration: remote.duration ?? undefined,
        },
      });
      reconciled += 1;
      continue;
    }
    if (
      candidates.length === 0 &&
      Date.now() - call.createdAt.getTime() >= AMBIGUOUS_CALL_SETTLE_MS
    ) {
      await db.transaction(async (tx) => {
        await tx
          .update(voiceCall)
          .set({
            failureCode: "TWILIO_CALL_NOT_CREATED",
            failureMessage:
              "No matching provider call was found during reconciliation.",
            updatedAt: new Date(),
          })
          .where(eq(voiceCall.id, call.id));
        await releaseVoiceSpendReservation({
          tx,
          organizationId: call.organizationId,
          voiceCallId: call.id,
          reason: "ambiguous-call-not-found",
          at: new Date(),
        });
      });
      reconciled += 1;
      continue;
    }
    if (candidates.length > 1) {
      await db
        .update(voiceCall)
        .set({
          failureCode: "TWILIO_CALL_RECONCILIATION_REQUIRED",
          failureMessage:
            "Multiple provider calls matched; manual reconciliation is required.",
          updatedAt: new Date(),
        })
        .where(eq(voiceCall.id, call.id));
    }
  }
  return reconciled;
}

function providerStatus(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }
  return null;
}

export async function reconcileVoiceCosts(): Promise<number> {
  const calls = await db
    .select()
    .from(voiceCall)
    .where(
      and(
        inArray(voiceCall.status, [
          "COMPLETED",
          "BUSY",
          "NO_ANSWER",
          "CANCELED",
          "FAILED",
        ]),
        isNotNull(voiceCall.providerCallId),
        isNull(voiceCall.providerCostReconciledAt),
      ),
    )
    .limit(50);
  let reconciled = 0;
  for (const call of calls) {
    if (!call.providerCallId) continue;
    const binding = await resolveTwilioPlatformAccount({
      organizationId: call.organizationId,
    });
    if (!binding.client || binding.account.id !== call.providerAccountId) {
      continue;
    }
    const remote = await binding.client.calls(call.providerCallId).fetch();
    const parsedPrice = providerPriceSchema.safeParse(remote.price);
    const parsedCurrency = providerCurrencySchema.safeParse(remote.priceUnit);
    if (!parsedPrice.success || !parsedCurrency.success) continue;
    const providerCost = parsedPrice.data.replace(/^-/, "");
    const providerCurrency = parsedCurrency.data.toUpperCase();
    const occurredAt = call.endedAt ?? new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(voiceCall)
        .set({
          providerCost,
          providerCostCurrency: providerCurrency,
          providerCostReconciledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(voiceCall.id, call.id));
      await tx
        .insert(communicationUsageLedger)
        .values({
          id: createId(),
          organizationId: call.organizationId,
          locationId: call.locationId,
          clientId: call.clientId,
          provider: "TWILIO",
          providerAccountId: call.providerAccountId,
          phoneNumberId: call.phoneNumberId,
          voiceCallId: call.id,
          entryKind: "USAGE",
          resourceType: "VOICE_SECOND",
          idempotencyKey: `twilio:voice:${call.providerCallId}:provider-cost`,
          providerResourceId: call.providerCallId,
          quantity: String(call.durationSeconds ?? 0),
          unit: "second",
          providerCost,
          customerCharge: "0",
          currency: providerCurrency,
          occurredAt,
          billingPeriod: billingPeriod(occurredAt),
          metadata: { basis: "twilio-reconciliation" },
        })
        .onConflictDoNothing();
    });
    reconciled += 1;
  }
  return reconciled;
}

export async function purgeExpiredVoiceRecordings(): Promise<number> {
  const calls = await db
    .select()
    .from(voiceCall)
    .where(
      and(
        isNotNull(voiceCall.recordingProviderId),
        isNotNull(voiceCall.recordingDeleteScheduledAt),
        isNull(voiceCall.recordingDeletedAt),
        lte(voiceCall.recordingDeleteScheduledAt, new Date()),
      ),
    )
    .limit(50);
  let deleted = 0;
  for (const call of calls) {
    if (!call.recordingProviderId) continue;
    const binding = await resolveTwilioPlatformAccount({
      organizationId: call.organizationId,
    });
    if (!binding.client || binding.account.id !== call.providerAccountId) {
      continue;
    }
    try {
      await binding.client.recordings(call.recordingProviderId).remove();
    } catch (error) {
      if (providerStatus(error) !== 404) throw error;
    }
    await db
      .update(voiceCall)
      .set({
        recordingObjectKey: null,
        recordingDeletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(voiceCall.id, call.id));
    deleted += 1;
  }
  return deleted;
}
