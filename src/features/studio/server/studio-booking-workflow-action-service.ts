import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { checkIn, classWaitlist, client, studioClass } from "@/db/schema";
import { dispatchMemberCheckInWorkflows } from "@/features/studio/server/checkin-router";
import { performMemberCheckIn } from "@/features/studio/server/member-checkin-service";
import {
  runStudioNoShowWorkflowAction,
  type StudioNoShowWorkflowActionResult,
} from "@/features/studio/server/studio-no-show-workflow-action-service";
import {
  joinClassWaitlist,
  leaveClassWaitlist,
} from "@/features/studio/server/waitlist-service";

export type StudioBookingWorkflowOperation =
  | "CHECK_IN"
  | "MARK_NO_SHOW"
  | "JOIN_WAITLIST"
  | "LEAVE_WAITLIST";

type StudioBookingWorkflowActionInput = {
  operation: StudioBookingWorkflowOperation;
  organizationId: string;
  locationId: string;
  actorUserId: string;
  classId: string;
  clientId: string;
};

export type StudioBookingWorkflowActionResult =
  | StudioNoShowWorkflowActionResult
  | {
      operation: "CHECK_IN";
      checkInId: string;
      classId: string;
      clientId: string;
      attendanceCount: number;
      alreadyApplied: boolean;
    }
  | {
      operation: "JOIN_WAITLIST" | "LEAVE_WAITLIST";
      waitlistId: string;
      classId: string;
      clientId: string;
      position: number;
      status: string;
      alreadyApplied: boolean;
    };

export async function runStudioBookingWorkflowAction(
  input: StudioBookingWorkflowActionInput,
): Promise<StudioBookingWorkflowActionResult> {
  if (input.operation === "CHECK_IN") return checkInMember(input);
  if (input.operation === "MARK_NO_SHOW") {
    return runStudioNoShowWorkflowAction(input);
  }
  if (input.operation === "JOIN_WAITLIST") return joinWaitlist(input);
  return leaveWaitlist(input);
}

async function checkInMember(
  input: StudioBookingWorkflowActionInput,
): Promise<StudioBookingWorkflowActionResult> {
  const existing = await findExistingCheckIn(input);
  if (existing) return toCheckInResult(existing, true);

  try {
    const result = await performMemberCheckIn({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      activeLocationId: input.locationId,
      classId: input.classId,
      clientId: input.clientId,
      method: "MANUAL",
    });
    await dispatchMemberCheckInWorkflows({
      organizationId: input.organizationId,
      locationId: result.studioClass.locationId,
      checkInId: result.checkInRecord.id,
      client: result.client,
      studioClass: result.studioClass,
      introOffers: result.introOffers,
    });
    return {
      operation: "CHECK_IN",
      checkInId: result.checkInRecord.id,
      classId: result.studioClass.id,
      clientId: result.client.id,
      attendanceCount: result.client.attendanceCount,
      alreadyApplied: false,
    };
  } catch (error) {
    if (!(error instanceof TRPCError) || error.code !== "CONFLICT") throw error;
    const raced = await findExistingCheckIn(input);
    if (!raced) throw error;
    return toCheckInResult(raced, true);
  }
}

async function joinWaitlist(
  input: StudioBookingWorkflowActionInput,
): Promise<StudioBookingWorkflowActionResult> {
  const existing = await findWaitlistEntry(input);
  if (existing && ["WAITING", "NOTIFIED"].includes(existing.status)) {
    return toWaitlistResult("JOIN_WAITLIST", existing, true);
  }

  try {
    const result = await joinClassWaitlist(input);
    return toWaitlistResult("JOIN_WAITLIST", result, false);
  } catch (error) {
    if (!(error instanceof TRPCError) || error.code !== "CONFLICT") throw error;
    const raced = await findWaitlistEntry(input);
    if (!raced || !["WAITING", "NOTIFIED"].includes(raced.status)) throw error;
    return toWaitlistResult("JOIN_WAITLIST", raced, true);
  }
}

async function leaveWaitlist(
  input: StudioBookingWorkflowActionInput,
): Promise<StudioBookingWorkflowActionResult> {
  const existing = await findWaitlistEntry(input);
  if (!existing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "This member is not on the class waitlist.",
    });
  }
  if (existing.status === "CANCELLED_WAITLIST") {
    return toWaitlistResult("LEAVE_WAITLIST", existing, true);
  }
  if (!["WAITING", "NOTIFIED"].includes(existing.status)) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This waitlist entry can no longer be removed.",
    });
  }

  try {
    const result = await leaveClassWaitlist({
      organizationId: input.organizationId,
      locationId: input.locationId,
      waitlistId: existing.id,
    });
    return toWaitlistResult("LEAVE_WAITLIST", result, false);
  } catch (error) {
    if (!(error instanceof TRPCError) || error.code !== "PRECONDITION_FAILED") {
      throw error;
    }
    const raced = await findWaitlistEntry(input);
    if (!raced || raced.status !== "CANCELLED_WAITLIST") throw error;
    return toWaitlistResult("LEAVE_WAITLIST", raced, true);
  }
}

async function findExistingCheckIn(input: StudioBookingWorkflowActionInput) {
  const [existing] = await db
    .select({
      id: checkIn.id,
      classId: checkIn.classId,
      clientId: checkIn.clientId,
      attendanceCount: client.attendanceCount,
    })
    .from(checkIn)
    .innerJoin(studioClass, eq(studioClass.id, checkIn.classId))
    .innerJoin(client, eq(client.id, checkIn.clientId))
    .where(
      and(
        eq(checkIn.classId, input.classId),
        eq(checkIn.clientId, input.clientId),
        eq(checkIn.organizationId, input.organizationId),
        eq(checkIn.locationId, input.locationId),
        eq(studioClass.organizationId, input.organizationId),
        eq(studioClass.locationId, input.locationId),
        eq(client.organizationId, input.organizationId),
        eq(client.locationId, input.locationId),
      ),
    )
    .limit(1);
  return existing;
}

async function findWaitlistEntry(input: StudioBookingWorkflowActionInput) {
  const [entry] = await db
    .select({
      id: classWaitlist.id,
      classId: classWaitlist.classId,
      clientId: classWaitlist.clientId,
      position: classWaitlist.position,
      status: classWaitlist.status,
    })
    .from(classWaitlist)
    .innerJoin(studioClass, eq(studioClass.id, classWaitlist.classId))
    .innerJoin(client, eq(client.id, classWaitlist.clientId))
    .where(
      and(
        eq(classWaitlist.classId, input.classId),
        eq(classWaitlist.clientId, input.clientId),
        eq(studioClass.organizationId, input.organizationId),
        eq(studioClass.locationId, input.locationId),
        eq(client.organizationId, input.organizationId),
        eq(client.locationId, input.locationId),
      ),
    )
    .limit(1);
  return entry;
}

function toCheckInResult(
  input: NonNullable<Awaited<ReturnType<typeof findExistingCheckIn>>>,
  alreadyApplied: boolean,
): StudioBookingWorkflowActionResult {
  return {
    operation: "CHECK_IN",
    checkInId: input.id,
    classId: input.classId,
    clientId: input.clientId,
    attendanceCount: input.attendanceCount,
    alreadyApplied,
  };
}

function toWaitlistResult(
  operation: "JOIN_WAITLIST" | "LEAVE_WAITLIST",
  input: {
    id: string;
    classId: string;
    clientId: string;
    position: number;
    status: string;
  },
  alreadyApplied: boolean,
): StudioBookingWorkflowActionResult {
  return {
    operation,
    waitlistId: input.id,
    classId: input.classId,
    clientId: input.clientId,
    position: input.position,
    status: input.status,
    alreadyApplied,
  };
}
