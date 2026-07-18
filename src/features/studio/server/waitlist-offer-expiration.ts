import "server-only";

import { and, asc, eq, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import { classWaitlist, studioClass } from "@/db/schema";

import {
  reserveWaitlistOfferForReleasedSeat,
  type WaitlistOffer,
} from "./waitlist-offer-service";

export async function expireDueWaitlistOffers(input?: {
  now?: Date;
  limit?: number;
}): Promise<{ expired: number; waitlistOffers: WaitlistOffer[] }> {
  const now = input?.now ?? new Date();
  const due = await db
    .select({
      waitlistId: classWaitlist.id,
      classId: classWaitlist.classId,
      organizationId: studioClass.organizationId,
      locationId: studioClass.locationId,
    })
    .from(classWaitlist)
    .innerJoin(studioClass, eq(classWaitlist.classId, studioClass.id))
    .where(
      and(
        eq(classWaitlist.status, "NOTIFIED"),
        lte(classWaitlist.offerExpiresAt, now),
      ),
    )
    .orderBy(asc(classWaitlist.offerExpiresAt))
    .limit(input?.limit ?? 100);

  let expired = 0;
  const waitlistOffers: WaitlistOffer[] = [];
  for (const candidate of due) {
    if (!candidate.locationId) continue;
    const locationId = candidate.locationId;
    const next = await db.transaction(async (tx) => {
      await tx.execute(sql`
        SELECT id FROM "StudioClass"
        WHERE id = ${candidate.classId}
          AND "organizationId" = ${candidate.organizationId}
          AND "locationId" = ${locationId}
        FOR UPDATE
      `);
      const [updated] = await tx
        .update(classWaitlist)
        .set({ status: "EXPIRED", respondedAt: now, updatedAt: now })
        .where(
          and(
            eq(classWaitlist.id, candidate.waitlistId),
            eq(classWaitlist.status, "NOTIFIED"),
            lte(classWaitlist.offerExpiresAt, now),
          ),
        )
        .returning({ id: classWaitlist.id });
      if (!updated) return null;
      expired += 1;
      return reserveWaitlistOfferForReleasedSeat({
        tx,
        organizationId: candidate.organizationId,
        locationId,
        classId: candidate.classId,
        now,
      });
    });
    if (next) waitlistOffers.push(next);
  }
  return { expired, waitlistOffers };
}
