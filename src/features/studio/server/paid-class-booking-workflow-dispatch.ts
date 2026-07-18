import "server-only";

import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { NodeType } from "@/db/enums";
import {
  bookingEntitlementAllocation,
  classCredit,
  client,
  studioBooking,
  studioClass,
  studioMembership,
} from "@/db/schema";
import { matchesClassBookedTrigger } from "@/features/nodes/studio/lib/studio-node-config";
import { triggerWorkflowsForNodeType } from "@/lib/workflow-triggers";

const DISPATCH_BATCH_SIZE = 50;

type PendingBooking = {
  bookingId: string;
  clientId: string;
  classId: string;
  serviceTypeId: string | null;
  classSeriesId: string | null;
  organizationId: string;
  locationId: string | null;
  className: string;
  classStartTime: Date;
  clientName: string;
  clientEmail: string | null;
  bookingCount: number;
};

export async function dispatchClassBookingWorkflow(
  bookingId: string,
): Promise<boolean> {
  const [booking] = await pendingBookingQuery().where(
    and(eq(studioBooking.id, bookingId), pendingWorkflowCondition()),
  );
  if (!booking) return false;
  return dispatchPendingBooking(booking);
}

export async function dispatchPendingPaidClassBookingWorkflows(): Promise<number> {
  const pending = await pendingBookingQuery()
    .where(pendingWorkflowCondition())
    .orderBy(asc(studioBooking.confirmedAt))
    .limit(DISPATCH_BATCH_SIZE);

  let dispatched = 0;
  for (const booking of pending) {
    if (await dispatchPendingBooking(booking)) dispatched += 1;
  }
  return dispatched;
}

function pendingBookingQuery() {
  return db
    .select({
      bookingId: studioBooking.id,
      clientId: studioBooking.clientId,
      classId: studioBooking.classId,
      serviceTypeId: studioClass.serviceTypeId,
      classSeriesId: sql<
        string | null
      >`${studioClass.metadata}->>'classSeriesId'`,
      organizationId: studioClass.organizationId,
      locationId: studioClass.locationId,
      className: studioClass.name,
      classStartTime: studioClass.startTime,
      clientName: client.name,
      clientEmail: client.email,
      bookingCount:
        sql<number>`(select count(*)::int from "StudioBooking" member_booking where member_booking."clientId" = ${studioBooking.clientId})`.mapWith(
          Number,
        ),
    })
    .from(studioBooking)
    .innerJoin(studioClass, eq(studioBooking.classId, studioClass.id))
    .innerJoin(
      client,
      and(
        eq(studioBooking.clientId, client.id),
        eq(client.organizationId, studioClass.organizationId),
        eq(client.locationId, studioClass.locationId),
      ),
    );
}

function pendingWorkflowCondition() {
  return and(
    inArray(studioBooking.status, ["BOOKED", "ATTENDED"]),
    or(
      and(
        eq(studioBooking.paymentStatus, "NOT_REQUIRED"),
        sql`${studioBooking.metadata} @> '{"classBookedWorkflowPending": true}'::jsonb`,
      ),
      and(
        eq(studioBooking.paymentStatus, "PAID"),
        or(
          sql`${studioBooking.metadata} @> '{"classBookedWorkflowPending": true}'::jsonb`,
          sql`${studioBooking.metadata} @> '{"paidWorkflowPending": true}'::jsonb`,
        ),
      ),
    ),
  );
}

async function dispatchPendingBooking(
  booking: PendingBooking,
): Promise<boolean> {
  if (!booking.locationId) return false;
  await triggerWorkflowsForNodeType({
    nodeType: NodeType.CLASS_BOOKED_TRIGGER,
    organizationId: booking.organizationId,
    locationId: booking.locationId,
    idempotencyKey: `class-booked:${booking.bookingId}`,
    triggerData: {
      bookingId: booking.bookingId,
      clientId: booking.clientId,
      classId: booking.classId,
      bookingCount: booking.bookingCount,
      client: {
        id: booking.clientId,
        name: booking.clientName,
        email: booking.clientEmail,
      },
      class: {
        id: booking.classId,
        name: booking.className,
        startTime: booking.classStartTime.toISOString(),
        serviceTypeId: booking.serviceTypeId,
        classSeriesId: booking.classSeriesId,
      },
    },
    shouldTriggerNode: (node) =>
      matchesClassBookedTrigger(node.data, {
        classId: booking.classId,
        className: booking.className,
        serviceTypeId: booking.serviceTypeId,
        classSeriesId: booking.classSeriesId,
        bookingCount: booking.bookingCount,
      }),
  });
  await dispatchPricingCreditWorkflows(booking);
  await db
    .update(studioBooking)
    .set({
      metadata: sql`coalesce(${studioBooking.metadata}, '{}'::jsonb) || jsonb_build_object('classBookedWorkflowPending', false, 'paidWorkflowPending', false, 'classBookedWorkflowDispatchedAt', ${new Date().toISOString()})`,
      updatedAt: new Date(),
    })
    .where(
      and(eq(studioBooking.id, booking.bookingId), pendingWorkflowCondition()),
    );
  return true;
}

async function dispatchPricingCreditWorkflows(
  booking: PendingBooking,
): Promise<void> {
  const [allocation] = await db
    .select({
      membershipId: bookingEntitlementAllocation.membershipId,
      source: bookingEntitlementAllocation.source,
      membershipName: studioMembership.name,
      membershipTotal: studioMembership.totalClasses,
      membershipUsed: studioMembership.usedClasses,
      creditTotal: classCredit.totalCredits,
      creditUsed: classCredit.usedCredits,
      pricingOptionId: sql<
        string | null
      >`${studioMembership.metadata} ->> 'pricingOptionId'`,
    })
    .from(bookingEntitlementAllocation)
    .leftJoin(
      studioMembership,
      eq(studioMembership.id, bookingEntitlementAllocation.membershipId),
    )
    .leftJoin(
      classCredit,
      eq(classCredit.id, bookingEntitlementAllocation.classCreditId),
    )
    .where(
      and(
        eq(bookingEntitlementAllocation.bookingId, booking.bookingId),
        eq(bookingEntitlementAllocation.organizationId, booking.organizationId),
        booking.locationId
          ? eq(bookingEntitlementAllocation.locationId, booking.locationId)
          : isNull(bookingEntitlementAllocation.locationId),
        eq(bookingEntitlementAllocation.status, "ACTIVE"),
      ),
    )
    .limit(1);
  if (!allocation?.membershipId) return;
  const total = allocation.creditTotal ?? allocation.membershipTotal;
  const used = allocation.creditUsed ?? allocation.membershipUsed ?? 0;
  if (total === null || total === undefined) return;
  const remainingCredits = Math.max(total - used, 0);

  await triggerWorkflowsForNodeType({
    nodeType: NodeType.INTRO_OFFER_COMPLETED_TRIGGER,
    organizationId: booking.organizationId,
    locationId: booking.locationId,
    idempotencyKey: `pricing-credit:${booking.bookingId}:${allocation.membershipId}:${remainingCredits}`,
    triggerData: {
      bookingId: booking.bookingId,
      clientId: booking.clientId,
      client: {
        id: booking.clientId,
        name: booking.clientName,
        email: booking.clientEmail,
      },
      pricingOption: {
        id: allocation.pricingOptionId,
        membershipId: allocation.membershipId,
        name: allocation.membershipName,
        totalCredits: total,
        usedCredits: used,
        remainingCredits,
      },
    },
    shouldTriggerNode: (node) => {
      const threshold = getNumberFromData(node.data, "creditThreshold");
      if (threshold === undefined || threshold !== remainingCredits) return false;
      const configuredIds = getStringArrayFromData(
        node.data,
        "pricingOptionIds",
      );
      return (
        configuredIds.length === 0 ||
        Boolean(
          allocation.pricingOptionId &&
            configuredIds.includes(allocation.pricingOptionId),
        )
      );
    },
  });
}

function getNumberFromData(value: unknown, key: string): number | undefined {
  if (!isDataObject(value)) return undefined;
  return typeof value[key] === "number" ? value[key] : undefined;
}

function getStringArrayFromData(value: unknown, key: string): string[] {
  if (!isDataObject(value) || !Array.isArray(value[key])) return [];
  return value[key].filter((item): item is string => typeof item === "string");
}

function isDataObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
