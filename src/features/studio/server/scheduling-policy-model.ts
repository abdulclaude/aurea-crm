import "server-only";

import { TRPCError } from "@trpc/server";

import type {
  bookingWindowPolicyVersion,
  waitlistPolicyVersion,
} from "@/db/schema";
import {
  bookingWindowValuesSchema,
  waitlistValuesSchema,
  type BookingWindowPolicyVersionView,
  type BookingWindowPolicyView,
  type SchedulingPolicyKind,
  type SchedulingPolicyListView,
  type WaitlistPolicyVersionView,
  type WaitlistPolicyView,
} from "@/features/studio/scheduling/contracts";

type BookingVersion = typeof bookingWindowPolicyVersion.$inferSelect;
type WaitlistVersion = typeof waitlistPolicyVersion.$inferSelect;

export type {
  BookingWindowPolicyVersionView,
  BookingWindowPolicyView,
  SchedulingPolicyListView,
  WaitlistPolicyVersionView,
  WaitlistPolicyView,
};

export function bookingVersionView(
  row: BookingVersion,
): BookingWindowPolicyVersionView {
  const values = bookingWindowValuesSchema.safeParse({
    opensMinutesBeforeStart: row.opensMinutesBeforeStart,
    closesMinutesBeforeStart: row.closesMinutesBeforeStart,
    cancellationsCloseMinutesBeforeStart:
      row.cancellationsCloseMinutesBeforeStart,
    blockClientCancellations: row.blockClientCancellations,
  });
  if (!values.success) invalidVersion("booking window", row.version);
  return {
    id: row.id,
    policyId: row.policyId,
    version: row.version,
    schemaVersion: row.schemaVersion,
    values: values.data,
    effectiveFrom: row.effectiveFrom,
    rollbackFromVersion: row.rollbackFromVersion,
    changeNote: row.changeNote,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

export function waitlistVersionView(
  row: WaitlistVersion,
): WaitlistPolicyVersionView {
  const values = waitlistValuesSchema.safeParse({
    mode: row.mode,
    automationClosesMinutesBeforeStart: row.automationClosesMinutesBeforeStart,
    maxEntries: row.maxEntries,
    allowOverlappingReservations: row.allowOverlappingReservations,
    creditHoldPolicy: row.creditHoldPolicy,
    offerExpiryMinutes: row.offerExpiryMinutes,
    failureFallback: row.failureFallback,
  });
  if (!values.success) invalidVersion("waitlist", row.version);
  return {
    id: row.id,
    policyId: row.policyId,
    version: row.version,
    schemaVersion: row.schemaVersion,
    values: values.data,
    effectiveFrom: row.effectiveFrom,
    rollbackFromVersion: row.rollbackFromVersion,
    changeNote: row.changeNote,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

export function schedulingPolicyNotFound(kind: SchedulingPolicyKind): never {
  throw new TRPCError({
    code: "NOT_FOUND",
    message:
      kind === "BOOKING_WINDOW"
        ? "Booking window policy not found."
        : "Waitlist policy not found.",
  });
}

function invalidVersion(label: string, version: number): never {
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `Stored ${label} policy version ${version} is invalid.`,
  });
}
