import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, lt, gt, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { classWaitlist, client, studioBooking, studioClass } from "@/db/schema";
import type { CommerceTransaction } from "@/features/commerce/server/stripe/stripe-event-receipt";
import {
  createClassBooking,
  type CreateClassBookingResult,
} from "@/features/studio/server/class-booking-service";
import {
  reserveWaitlistOfferForReleasedSeat,
  type WaitlistOffer,
} from "@/features/studio/server/waitlist-offer-service";

type WaitlistScope = {
  organizationId: string;
  locationId: string;
};

type JoinWaitlistInput = WaitlistScope & {
  classId: string;
  clientId: string;
  now?: Date;
};

type WaitlistEntryInput = WaitlistScope & {
  waitlistId: string;
  now?: Date;
};

type ConfirmWaitlistInput = WaitlistEntryInput & {
  createdBy: string;
  slidingScaleAmount?: string;
};

type WaitlistRow = typeof classWaitlist.$inferSelect;
type WaitlistClient = {
  id: string;
  name: string;
  email: string | null;
};

const waitlistReturning = {
  id: classWaitlist.id,
  classId: classWaitlist.classId,
  clientId: classWaitlist.clientId,
  position: classWaitlist.position,
  joinedAt: classWaitlist.joinedAt,
  notifiedAt: classWaitlist.notifiedAt,
  respondedAt: classWaitlist.respondedAt,
  waitlistPolicyVersionId: classWaitlist.waitlistPolicyVersionId,
  waitlistPolicySource: classWaitlist.waitlistPolicySource,
  offerExpiresAt: classWaitlist.offerExpiresAt,
  offerDispatchedAt: classWaitlist.offerDispatchedAt,
  offerDispatchAttempts: classWaitlist.offerDispatchAttempts,
  lastOfferDispatchAt: classWaitlist.lastOfferDispatchAt,
  offerDispatchError: classWaitlist.offerDispatchError,
  status: classWaitlist.status,
  createdAt: classWaitlist.createdAt,
  updatedAt: classWaitlist.updatedAt,
};

export async function joinClassWaitlist(
  input: JoinWaitlistInput,
): Promise<WaitlistRow & { client: WaitlistClient }> {
  const now = input.now ?? new Date();
  return db.transaction(async (tx) => {
    await lockClass(tx, input);
    const [targetClass] = await tx
      .select({
        id: studioClass.id,
        status: studioClass.status,
        startTime: studioClass.startTime,
        endTime: studioClass.endTime,
        waitlistEnabled: studioClass.waitlistEnabled,
        autoPromoteWaitlist: studioClass.autoPromoteWaitlist,
        waitlistMode: studioClass.waitlistMode,
        waitlistMaxEntries: studioClass.waitlistMaxEntries,
        waitlistAllowOverlappingReservations:
          studioClass.waitlistAllowOverlappingReservations,
        resolvedWaitlistPolicyVersionId:
          studioClass.resolvedWaitlistPolicyVersionId,
        waitlistPolicySource: studioClass.waitlistPolicySource,
      })
      .from(studioClass)
      .where(classScopeWhere(input))
      .limit(1);
    if (!targetClass) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
    }
    if (
      targetClass.status !== "SCHEDULED" ||
      targetClass.startTime <= now ||
      resolvedWaitlistMode(targetClass) === "DISABLED"
    ) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "The waitlist is not available for this class",
      });
    }

    const [targetClient] = await tx
      .select({
        id: client.id,
        name: client.name,
        email: client.email,
      })
      .from(client)
      .where(
        and(
          eq(client.id, input.clientId),
          eq(client.organizationId, input.organizationId),
          eq(client.locationId, input.locationId),
        ),
      )
      .limit(1);
    if (!targetClient) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
    }
    await tx.execute(
      sql`SELECT id FROM "Client"
          WHERE id = ${input.clientId}
            AND "organizationId" = ${input.organizationId}
            AND "locationId" = ${input.locationId}
          FOR UPDATE`,
    );

    if (targetClass.waitlistMaxEntries !== null) {
      const [activeWaitlist] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(classWaitlist)
        .where(
          and(
            eq(classWaitlist.classId, input.classId),
            inArray(classWaitlist.status, ["WAITING", "NOTIFIED"]),
          ),
        );
      if ((activeWaitlist?.count ?? 0) >= targetClass.waitlistMaxEntries) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "The waitlist is full for this class.",
        });
      }
    }

    if (targetClass.waitlistAllowOverlappingReservations === false) {
      const [overlap] = await tx
        .select({ id: classWaitlist.id })
        .from(classWaitlist)
        .innerJoin(studioClass, eq(classWaitlist.classId, studioClass.id))
        .where(
          and(
            eq(classWaitlist.clientId, input.clientId),
            inArray(classWaitlist.status, ["WAITING", "NOTIFIED"]),
            ne(classWaitlist.classId, input.classId),
            eq(studioClass.organizationId, input.organizationId),
            eq(studioClass.locationId, input.locationId),
            lt(studioClass.startTime, targetClass.endTime),
            gt(studioClass.endTime, targetClass.startTime),
          ),
        )
        .limit(1);
      if (overlap) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "This member already has an overlapping waitlist reservation.",
        });
      }
    }

    const [booking] = await tx
      .select({ id: studioBooking.id })
      .from(studioBooking)
      .where(
        and(
          eq(studioBooking.classId, input.classId),
          eq(studioBooking.clientId, input.clientId),
          inArray(studioBooking.status, ["BOOKED", "ATTENDED"]),
        ),
      )
      .limit(1);
    if (booking) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Member is already booked for this class",
      });
    }

    const [existing] = await tx
      .select(waitlistReturning)
      .from(classWaitlist)
      .where(
        and(
          eq(classWaitlist.classId, input.classId),
          eq(classWaitlist.clientId, input.clientId),
        ),
      )
      .limit(1);
    if (existing && ["WAITING", "NOTIFIED"].includes(existing.status)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Member is already on the waitlist",
      });
    }

    const [lastPosition] = await tx
      .select({ position: classWaitlist.position })
      .from(classWaitlist)
      .where(eq(classWaitlist.classId, input.classId))
      .orderBy(desc(classWaitlist.position))
      .limit(1);
    const values = {
      position: (lastPosition?.position ?? 0) + 1,
      joinedAt: now,
      notifiedAt: null,
      respondedAt: null,
      waitlistPolicyVersionId: targetClass.resolvedWaitlistPolicyVersionId,
      waitlistPolicySource: targetClass.waitlistPolicySource,
      offerExpiresAt: null,
      offerDispatchedAt: null,
      offerDispatchAttempts: 0,
      lastOfferDispatchAt: null,
      offerDispatchError: null,
      status: "WAITING" as const,
      updatedAt: now,
    };
    const [entry] = existing
      ? await tx
          .update(classWaitlist)
          .set(values)
          .where(eq(classWaitlist.id, existing.id))
          .returning(waitlistReturning)
      : await tx
          .insert(classWaitlist)
          .values({
            id: createId(),
            classId: input.classId,
            clientId: input.clientId,
            ...values,
            createdAt: now,
          })
          .returning(waitlistReturning);
    if (!entry) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to join the waitlist",
        cause: new Error("Waitlist write returned no row"),
      });
    }
    return { ...entry, client: targetClient };
  });
}

export async function leaveClassWaitlist(
  input: WaitlistEntryInput,
): Promise<WaitlistRow> {
  const now = input.now ?? new Date();
  return db.transaction(async (tx) => {
    const entry = await lockScopedEntry(tx, input);
    if (!["WAITING", "NOTIFIED"].includes(entry.status)) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "This waitlist entry is no longer active",
      });
    }
    const [updated] = await tx
      .update(classWaitlist)
      .set({ status: "CANCELLED_WAITLIST", respondedAt: now, updatedAt: now })
      .where(
        and(
          eq(classWaitlist.id, input.waitlistId),
          inArray(classWaitlist.status, ["WAITING", "NOTIFIED"]),
        ),
      )
      .returning(waitlistReturning);
    if (!updated) throw waitlistRaceError();
    return updated;
  });
}

export async function notifyNextClassWaitlistEntry(
  input: WaitlistScope & { classId: string; now?: Date },
): Promise<{
  id: string;
  classId: string;
  clientId: string;
  notifiedAt: Date;
  client: WaitlistClient;
} | null> {
  const now = input.now ?? new Date();
  return db.transaction(async (tx) => {
    await lockClass(tx, input);
    const [targetClass] = await tx
      .select({
        id: studioClass.id,
        status: studioClass.status,
        startTime: studioClass.startTime,
        waitlistEnabled: studioClass.waitlistEnabled,
        autoPromoteWaitlist: studioClass.autoPromoteWaitlist,
        waitlistMode: studioClass.waitlistMode,
        waitlistAutomationClosesMinutesBeforeStart:
          studioClass.waitlistAutomationClosesMinutesBeforeStart,
        waitlistOfferExpiryMinutes: studioClass.waitlistOfferExpiryMinutes,
        resolvedWaitlistPolicyVersionId:
          studioClass.resolvedWaitlistPolicyVersionId,
        waitlistPolicySource: studioClass.waitlistPolicySource,
      })
      .from(studioClass)
      .where(classScopeWhere(input))
      .limit(1);
    if (!targetClass) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
    }
    if (
      targetClass.status !== "SCHEDULED" ||
      targetClass.startTime <= now ||
      waitlistPromotionClosed(targetClass, now) ||
      resolvedWaitlistMode(targetClass) === "DISABLED"
    ) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Waitlist offers are not available for this class",
      });
    }
    const [next] = await tx
      .select({
        id: classWaitlist.id,
        classId: classWaitlist.classId,
        clientId: classWaitlist.clientId,
        clientName: client.name,
        clientEmail: client.email,
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
      .for("update", { of: classWaitlist, skipLocked: true });
    if (!next) return null;
    const [updated] = await tx
      .update(classWaitlist)
      .set({
        status: "NOTIFIED",
        notifiedAt: now,
        offerExpiresAt: targetClass.waitlistOfferExpiryMinutes
          ? new Date(
              now.getTime() +
                targetClass.waitlistOfferExpiryMinutes * 60 * 1_000,
            )
          : null,
        offerDispatchedAt: null,
        offerDispatchAttempts: 0,
        lastOfferDispatchAt: null,
        offerDispatchError: null,
        waitlistPolicyVersionId: targetClass.resolvedWaitlistPolicyVersionId,
        waitlistPolicySource: targetClass.waitlistPolicySource,
        updatedAt: now,
      })
      .where(
        and(eq(classWaitlist.id, next.id), eq(classWaitlist.status, "WAITING")),
      )
      .returning({ id: classWaitlist.id });
    if (!updated) throw waitlistRaceError();
    return {
      id: next.id,
      classId: next.classId,
      clientId: next.clientId,
      notifiedAt: now,
      client: {
        id: next.clientId,
        name: next.clientName,
        email: next.clientEmail,
      },
    };
  });
}

export async function confirmClassWaitlistEntry(
  input: ConfirmWaitlistInput,
): Promise<CreateClassBookingResult> {
  return db.transaction(async (tx) => {
    const entry = await lockScopedEntry(tx, input);
    if (entry.status !== "NOTIFIED") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "This waitlist offer is no longer available",
      });
    }
    if (
      entry.offerExpiresAt &&
      entry.offerExpiresAt <= (input.now ?? new Date())
    ) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "This waitlist offer has expired.",
      });
    }
    const booking = await createClassBooking(
      {
        organizationId: input.organizationId,
        locationId: input.locationId,
        classId: entry.classId,
        clientId: entry.clientId,
        channel: "OPERATOR",
        createdBy: input.createdBy,
        slidingScaleAmount: input.slidingScaleAmount,
        now: input.now,
      },
      tx,
    );
    const now = input.now ?? new Date();
    const [updated] = await tx
      .update(classWaitlist)
      .set({ status: "CONFIRMED", respondedAt: now, updatedAt: now })
      .where(
        and(
          eq(classWaitlist.id, input.waitlistId),
          eq(classWaitlist.status, "NOTIFIED"),
        ),
      )
      .returning({ id: classWaitlist.id });
    if (!updated) throw waitlistRaceError();
    return booking;
  });
}

export async function declineClassWaitlistEntry(
  input: WaitlistEntryInput,
): Promise<{
  classId: string;
  clientId: string;
  waitlistOffer: WaitlistOffer | null;
}> {
  const now = input.now ?? new Date();
  return db.transaction(async (tx) => {
    const entry = await lockScopedEntry(tx, input);
    if (entry.status !== "NOTIFIED") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "This waitlist offer is no longer available",
      });
    }
    const [updated] = await tx
      .update(classWaitlist)
      .set({ status: "EXPIRED", respondedAt: now, updatedAt: now })
      .where(
        and(
          eq(classWaitlist.id, input.waitlistId),
          eq(classWaitlist.status, "NOTIFIED"),
        ),
      )
      .returning({ id: classWaitlist.id });
    if (!updated) throw waitlistRaceError();
    const waitlistOffer = await reserveWaitlistOfferForReleasedSeat({
      tx,
      organizationId: input.organizationId,
      locationId: input.locationId,
      classId: entry.classId,
      now,
    });
    return {
      classId: entry.classId,
      clientId: entry.clientId,
      waitlistOffer,
    };
  });
}

export async function listClassWaitlist(
  input: WaitlistScope & { classId: string },
): Promise<
  Array<
    WaitlistRow & {
      client: WaitlistClient & { phone: string | null };
    }
  >
> {
  const rows = await db
    .select({
      ...waitlistReturning,
      clientName: client.name,
      clientEmail: client.email,
      clientPhone: client.phone,
    })
    .from(classWaitlist)
    .innerJoin(studioClass, eq(classWaitlist.classId, studioClass.id))
    .innerJoin(client, eq(classWaitlist.clientId, client.id))
    .where(
      and(
        eq(classWaitlist.classId, input.classId),
        eq(studioClass.organizationId, input.organizationId),
        eq(studioClass.locationId, input.locationId),
        eq(client.organizationId, input.organizationId),
        eq(client.locationId, input.locationId),
      ),
    )
    .orderBy(asc(classWaitlist.position));
  return rows.map(({ clientName, clientEmail, clientPhone, ...entry }) => ({
    ...entry,
    client: {
      id: entry.clientId,
      name: clientName,
      email: clientEmail,
      phone: clientPhone,
    },
  }));
}

export async function assertClassWaitlistScope(
  input: WaitlistScope & { classId: string },
): Promise<void> {
  const [targetClass] = await db
    .select({ id: studioClass.id })
    .from(studioClass)
    .where(classScopeWhere(input))
    .limit(1);
  if (!targetClass) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
  }
}

function classScopeWhere(input: WaitlistScope & { classId: string }) {
  return and(
    eq(studioClass.id, input.classId),
    eq(studioClass.organizationId, input.organizationId),
    eq(studioClass.locationId, input.locationId),
  );
}

async function lockClass(
  tx: CommerceTransaction,
  input: WaitlistScope & { classId: string },
): Promise<void> {
  await tx.execute(sql`
    SELECT id FROM "StudioClass"
    WHERE id = ${input.classId}
      AND "organizationId" = ${input.organizationId}
      AND "locationId" = ${input.locationId}
    FOR UPDATE
  `);
}

async function lockScopedEntry(
  tx: CommerceTransaction,
  input: WaitlistEntryInput,
) {
  const [scope] = await tx
    .select({ classId: classWaitlist.classId })
    .from(classWaitlist)
    .innerJoin(studioClass, eq(classWaitlist.classId, studioClass.id))
    .where(
      and(
        eq(classWaitlist.id, input.waitlistId),
        eq(studioClass.organizationId, input.organizationId),
        eq(studioClass.locationId, input.locationId),
      ),
    )
    .limit(1);
  if (!scope) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Waitlist entry not found",
    });
  }
  await lockClass(tx, { ...input, classId: scope.classId });
  await tx.execute(
    sql`SELECT id FROM "ClassWaitlist" WHERE id = ${input.waitlistId} FOR UPDATE`,
  );
  const [entry] = await tx
    .select({
      id: classWaitlist.id,
      classId: classWaitlist.classId,
      clientId: classWaitlist.clientId,
      status: classWaitlist.status,
      offerExpiresAt: classWaitlist.offerExpiresAt,
    })
    .from(classWaitlist)
    .innerJoin(studioClass, eq(classWaitlist.classId, studioClass.id))
    .innerJoin(client, eq(classWaitlist.clientId, client.id))
    .where(
      and(
        eq(classWaitlist.id, input.waitlistId),
        eq(studioClass.organizationId, input.organizationId),
        eq(studioClass.locationId, input.locationId),
        eq(client.organizationId, input.organizationId),
        eq(client.locationId, input.locationId),
      ),
    )
    .limit(1);
  if (!entry) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Waitlist entry not found",
    });
  }
  return entry;
}

function waitlistRaceError(): TRPCError {
  return new TRPCError({
    code: "CONFLICT",
    message: "The waitlist changed while this action was being processed",
  });
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
