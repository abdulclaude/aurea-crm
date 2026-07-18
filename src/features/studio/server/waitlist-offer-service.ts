import "server-only";

import { TRPCError } from "@trpc/server";
import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { classWaitlist, client, studioClass } from "@/db/schema";
import type { CommerceTransaction } from "@/features/commerce/server/stripe/stripe-event-receipt";

export type WaitlistOffer = {
  id: string;
  organizationId: string;
  locationId: string;
  classId: string;
  clientId: string;
  notifiedAt: Date;
  offerExpiresAt: Date | null;
};

export async function reserveWaitlistOfferForReleasedSeat(input: {
  tx: CommerceTransaction;
  organizationId: string;
  locationId: string;
  classId: string;
  now: Date;
}): Promise<WaitlistOffer | null> {
  await input.tx.execute(
    sql`SELECT id FROM "StudioClass"
        WHERE id = ${input.classId}
          AND "organizationId" = ${input.organizationId}
          AND "locationId" = ${input.locationId}
        FOR UPDATE`,
  );
  const [targetClass] = await input.tx
    .select({
      id: studioClass.id,
      waitlistEnabled: studioClass.waitlistEnabled,
      autoPromoteWaitlist: studioClass.autoPromoteWaitlist,
      waitlistMode: studioClass.waitlistMode,
      waitlistAutomationClosesMinutesBeforeStart:
        studioClass.waitlistAutomationClosesMinutesBeforeStart,
      waitlistOfferExpiryMinutes: studioClass.waitlistOfferExpiryMinutes,
      resolvedWaitlistPolicyVersionId:
        studioClass.resolvedWaitlistPolicyVersionId,
      waitlistPolicySource: studioClass.waitlistPolicySource,
      status: studioClass.status,
      startTime: studioClass.startTime,
    })
    .from(studioClass)
    .where(
      and(
        eq(studioClass.id, input.classId),
        eq(studioClass.organizationId, input.organizationId),
        eq(studioClass.locationId, input.locationId),
      ),
    )
    .limit(1);
  if (!targetClass) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
  }
  if (
    targetClass.status !== "SCHEDULED" ||
    targetClass.startTime <= input.now ||
    waitlistPromotionClosed(targetClass, input.now) ||
    resolvedWaitlistMode(targetClass) !== "OFFER_NEXT"
  ) {
    return null;
  }

  const [next] = await input.tx
    .select({
      id: classWaitlist.id,
      classId: classWaitlist.classId,
      clientId: classWaitlist.clientId,
    })
    .from(classWaitlist)
    .innerJoin(client, eq(classWaitlist.clientId, client.id))
    .where(
      and(
        eq(classWaitlist.classId, input.classId),
        eq(classWaitlist.status, "WAITING"),
        eq(client.organizationId, input.organizationId),
        eq(client.locationId, input.locationId),
      ),
    )
    .orderBy(asc(classWaitlist.position))
    .limit(1)
    .for("update", { of: classWaitlist });
  if (!next) return null;

  const offerExpiresAt = targetClass.waitlistOfferExpiryMinutes
    ? new Date(
        input.now.getTime() +
          targetClass.waitlistOfferExpiryMinutes * 60 * 1_000,
      )
    : null;

  const [reserved] = await input.tx
    .update(classWaitlist)
    .set({
      status: "NOTIFIED",
      notifiedAt: input.now,
      offerExpiresAt,
      offerDispatchedAt: null,
      offerDispatchAttempts: 0,
      lastOfferDispatchAt: null,
      offerDispatchError: null,
      waitlistPolicyVersionId: targetClass.resolvedWaitlistPolicyVersionId,
      waitlistPolicySource: targetClass.waitlistPolicySource,
      updatedAt: input.now,
    })
    .where(
      and(eq(classWaitlist.id, next.id), eq(classWaitlist.status, "WAITING")),
    )
    .returning({ id: classWaitlist.id });
  if (!reserved) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "The next waitlist entry changed while the spot was opening.",
    });
  }
  return {
    ...next,
    organizationId: input.organizationId,
    locationId: input.locationId,
    notifiedAt: input.now,
    offerExpiresAt,
  };
}

export function reserveAutoWaitlistOffer(input: {
  organizationId: string;
  locationId: string;
  classId: string;
  now?: Date;
}): Promise<WaitlistOffer | null> {
  const now = input.now ?? new Date();
  return db.transaction((tx) =>
    reserveWaitlistOfferForReleasedSeat({ ...input, tx, now }),
  );
}

function resolvedWaitlistMode(input: {
  waitlistMode: "DISABLED" | "MANUAL" | "OFFER_NEXT" | "AUTO_BOOK" | null;
  waitlistEnabled: boolean;
  autoPromoteWaitlist: boolean;
}) {
  return (
    input.waitlistMode ??
    (input.waitlistEnabled
      ? input.autoPromoteWaitlist
        ? "OFFER_NEXT"
        : "MANUAL"
      : "DISABLED")
  );
}

function waitlistPromotionClosed(
  input: {
    startTime: Date;
    waitlistAutomationClosesMinutesBeforeStart: number | null;
  },
  now: Date,
): boolean {
  const closesAt = new Date(
    input.startTime.getTime() -
      (input.waitlistAutomationClosesMinutesBeforeStart ?? 0) * 60 * 1_000,
  );
  return now >= closesAt;
}
