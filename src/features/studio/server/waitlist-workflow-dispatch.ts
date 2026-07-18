import "server-only";

import { and, asc, eq, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { NodeType } from "@/db/enums";
import { classWaitlist, studioClass } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { triggerWorkflowsForNodeType } from "@/lib/workflow-triggers";

const MAX_DISPATCH_ATTEMPTS = 10;
const RETRY_DELAY_MS = 60_000;

export async function dispatchWaitlistSpotOpened(input: {
  organizationId: string;
  locationId: string;
  waitlistId: string;
  clientId: string;
  classId: string;
  notifiedAt: Date;
}): Promise<void> {
  try {
    await inngest.send({
      name: "studio/waitlist-offer.dispatch",
      id: `waitlist-offer:${input.waitlistId}:${input.notifiedAt.toISOString()}`,
      data: { waitlistId: input.waitlistId },
    });
  } catch (error) {
    console.error("Failed to request waitlist workflow dispatch", {
      waitlistId: input.waitlistId,
      error: error instanceof Error ? error.message : "Unknown Inngest error",
    });
  }
}

export async function processWaitlistSpotOpenedDispatch(
  waitlistId: string,
): Promise<{ status: "DISPATCHED" | "IGNORED" }> {
  const [offer] = await db
    .select({
      waitlistId: classWaitlist.id,
      clientId: classWaitlist.clientId,
      classId: classWaitlist.classId,
      notifiedAt: classWaitlist.notifiedAt,
      offerExpiresAt: classWaitlist.offerExpiresAt,
      offerDispatchedAt: classWaitlist.offerDispatchedAt,
      offerDispatchAttempts: classWaitlist.offerDispatchAttempts,
      lastOfferDispatchAt: classWaitlist.lastOfferDispatchAt,
      status: classWaitlist.status,
      organizationId: studioClass.organizationId,
      locationId: studioClass.locationId,
    })
    .from(classWaitlist)
    .innerJoin(studioClass, eq(classWaitlist.classId, studioClass.id))
    .where(eq(classWaitlist.id, waitlistId))
    .limit(1);
  const now = new Date();
  if (
    !offer ||
    !offer.locationId ||
    !offer.notifiedAt ||
    offer.status !== "NOTIFIED" ||
    offer.offerDispatchedAt ||
    (offer.offerExpiresAt && offer.offerExpiresAt <= now) ||
    offer.offerDispatchAttempts >= MAX_DISPATCH_ATTEMPTS
  ) {
    return { status: "IGNORED" };
  }

  const [claimed] = await db
    .update(classWaitlist)
    .set({
      offerDispatchAttempts: sql`${classWaitlist.offerDispatchAttempts} + 1`,
      lastOfferDispatchAt: now,
      offerDispatchError: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(classWaitlist.id, waitlistId),
        eq(classWaitlist.status, "NOTIFIED"),
        isNull(classWaitlist.offerDispatchedAt),
        eq(
          classWaitlist.offerDispatchAttempts,
          offer.offerDispatchAttempts,
        ),
        offer.lastOfferDispatchAt
          ? eq(classWaitlist.lastOfferDispatchAt, offer.lastOfferDispatchAt)
          : isNull(classWaitlist.lastOfferDispatchAt),
      ),
    )
    .returning({ id: classWaitlist.id });
  if (!claimed) return { status: "IGNORED" };
  try {
    await triggerWorkflowsForNodeType({
      nodeType: NodeType.WAITLIST_SPOT_OPENED_TRIGGER,
      organizationId: offer.organizationId,
      locationId: offer.locationId,
      idempotencyKey: `waitlist-spot-opened:${offer.waitlistId}:${offer.notifiedAt.toISOString()}`,
      triggerData: {
        waitlistId: offer.waitlistId,
        clientId: offer.clientId,
        classId: offer.classId,
      },
    });
  } catch (error) {
    await db
      .update(classWaitlist)
      .set({
        offerDispatchError: dispatchErrorMessage(error),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(classWaitlist.id, waitlistId),
          eq(classWaitlist.status, "NOTIFIED"),
          isNull(classWaitlist.offerDispatchedAt),
        ),
      );
    throw error;
  }
  await db
    .update(classWaitlist)
    .set({
      offerDispatchedAt: new Date(),
      offerDispatchError: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(classWaitlist.id, waitlistId),
        eq(classWaitlist.status, "NOTIFIED"),
        isNull(classWaitlist.offerDispatchedAt),
      ),
    );
  return { status: "DISPATCHED" };
}

export async function findPendingWaitlistSpotOpenedDispatches(
  limit = 100,
): Promise<string[]> {
  const retryBefore = new Date(Date.now() - RETRY_DELAY_MS);
  const rows = await db
    .select({ id: classWaitlist.id })
    .from(classWaitlist)
    .where(
      and(
        eq(classWaitlist.status, "NOTIFIED"),
        isNull(classWaitlist.offerDispatchedAt),
        lt(classWaitlist.offerDispatchAttempts, MAX_DISPATCH_ATTEMPTS),
        or(
          isNull(classWaitlist.lastOfferDispatchAt),
          lt(classWaitlist.lastOfferDispatchAt, retryBefore),
        ),
      ),
    )
    .orderBy(asc(classWaitlist.notifiedAt))
    .limit(limit);
  return rows.map((row) => row.id);
}

function dispatchErrorMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : "Unknown dispatch error";
  return message.slice(0, 1_000);
}
