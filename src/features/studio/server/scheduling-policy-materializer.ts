import "server-only";

import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull, lte, or } from "drizzle-orm";

import {
  bookingWindowPolicy,
  bookingWindowPolicyVersion,
  serviceType,
  waitlistPolicy,
  waitlistPolicyVersion,
} from "@/db/schema";
import type {
  BookingWindowValues,
  WaitlistValues,
} from "@/features/studio/scheduling/contracts";
import {
  resolveBookingWindowPolicy,
  resolveWaitlistPolicy,
  type ResolvedSchedulingPolicy,
} from "@/features/studio/scheduling/resolution";

import type { SchedulingTransaction } from "./scheduling-policy-db";
import {
  bookingVersionView,
  waitlistVersionView,
  type BookingWindowPolicyVersionView,
  type WaitlistPolicyVersionView,
} from "./scheduling-policy-model";
import {
  legacyBookingValues,
  legacyWaitlistValues,
  requireExplicitSchedulingCandidate,
  schedulingCandidatesAt,
  toVersionedSchedulingPolicy,
  type LegacySchedulingValues,
} from "./scheduling-policy-materialization-helpers";

type MaterializeInput = {
  tx: SchedulingTransaction;
  organizationId: string;
  locationId: string | null;
  serviceTypeId?: string | null;
  bookingWindowPolicyOverrideId?: string | null;
  waitlistPolicyOverrideId?: string | null;
  startsAt: Date[];
  legacy: LegacySchedulingValues;
};

export type MaterializedSchedulingPolicies = {
  bookingWindow: ResolvedSchedulingPolicy<BookingWindowValues>;
  waitlist: ResolvedSchedulingPolicy<WaitlistValues>;
};

export async function materializeSchedulingPoliciesForOccurrences(
  input: MaterializeInput,
): Promise<MaterializedSchedulingPolicies[]> {
  if (input.startsAt.length === 0) return [];
  const assignment = input.serviceTypeId
    ? await getServiceAssignment(input)
    : null;
  const bookingDefinitions = await input.tx
    .select()
    .from(bookingWindowPolicy)
    .where(
      and(
        eq(bookingWindowPolicy.organizationId, input.organizationId),
        eq(bookingWindowPolicy.isActive, true),
        input.locationId
          ? or(
              isNull(bookingWindowPolicy.locationId),
              eq(bookingWindowPolicy.locationId, input.locationId),
            )
          : isNull(bookingWindowPolicy.locationId),
      ),
    );
  const waitlistDefinitions = await input.tx
    .select()
    .from(waitlistPolicy)
    .where(
      and(
        eq(waitlistPolicy.organizationId, input.organizationId),
        eq(waitlistPolicy.isActive, true),
        input.locationId
          ? or(
              isNull(waitlistPolicy.locationId),
              eq(waitlistPolicy.locationId, input.locationId),
            )
          : isNull(waitlistPolicy.locationId),
      ),
    );
  const maxStart = new Date(
    Math.max(...input.startsAt.map((date) => date.getTime())),
  );
  const [bookingVersions, waitlistVersions] = await Promise.all([
    getBookingVersions(
      input.tx,
      bookingDefinitions.map((policy) => policy.id),
      maxStart,
    ),
    getWaitlistVersions(
      input.tx,
      waitlistDefinitions.map((policy) => policy.id),
      maxStart,
    ),
  ]);

  return input.startsAt.map((startsAt) => {
    const booking = schedulingCandidatesAt({
      definitions: bookingDefinitions,
      versions: bookingVersions,
      startsAt,
      locationId: input.locationId,
      overrideId: input.bookingWindowPolicyOverrideId ?? null,
      servicePolicyId: assignment?.bookingWindowPolicyId ?? null,
    });
    const waitlist = schedulingCandidatesAt({
      definitions: waitlistDefinitions,
      versions: waitlistVersions,
      startsAt,
      locationId: input.locationId,
      overrideId: input.waitlistPolicyOverrideId ?? null,
      servicePolicyId: assignment?.waitlistPolicyId ?? null,
    });
    requireExplicitSchedulingCandidate(
      booking.override,
      input.bookingWindowPolicyOverrideId,
      "booking window override",
    );
    requireExplicitSchedulingCandidate(
      booking.service,
      assignment?.bookingWindowPolicyId,
      "service booking window",
    );
    requireExplicitSchedulingCandidate(
      waitlist.override,
      input.waitlistPolicyOverrideId,
      "waitlist override",
    );
    requireExplicitSchedulingCandidate(
      waitlist.service,
      assignment?.waitlistPolicyId,
      "service waitlist",
    );
    return {
      bookingWindow: resolveBookingWindowPolicy({
        classOverride: toVersionedSchedulingPolicy(booking.override),
        serviceAssignment: toVersionedSchedulingPolicy(booking.service),
        locationDefault: toVersionedSchedulingPolicy(booking.locationDefault),
        organizationDefault: toVersionedSchedulingPolicy(
          booking.organizationDefault,
        ),
        legacy: legacyBookingValues(input.legacy),
      }),
      waitlist: resolveWaitlistPolicy({
        classOverride: toVersionedSchedulingPolicy(waitlist.override),
        serviceAssignment: toVersionedSchedulingPolicy(waitlist.service),
        locationDefault: toVersionedSchedulingPolicy(waitlist.locationDefault),
        organizationDefault: toVersionedSchedulingPolicy(
          waitlist.organizationDefault,
        ),
        legacy: legacyWaitlistValues(input.legacy),
      }),
    };
  });
}

async function getServiceAssignment(input: MaterializeInput) {
  const [service] = await input.tx
    .select({
      bookingWindowPolicyId: serviceType.bookingWindowPolicyId,
      waitlistPolicyId: serviceType.waitlistPolicyId,
    })
    .from(serviceType)
    .where(
      and(
        eq(serviceType.id, input.serviceTypeId ?? ""),
        eq(serviceType.organizationId, input.organizationId),
        input.locationId
          ? eq(serviceType.locationId, input.locationId)
          : isNull(serviceType.locationId),
      ),
    )
    .limit(1);
  if (!service) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Service type not found in this workspace.",
    });
  }
  return service;
}

async function getBookingVersions(
  tx: SchedulingTransaction,
  ids: string[],
  at: Date,
) {
  if (ids.length === 0) return [];
  const rows = await tx
    .select()
    .from(bookingWindowPolicyVersion)
    .where(
      and(
        inArray(bookingWindowPolicyVersion.policyId, ids),
        lte(bookingWindowPolicyVersion.effectiveFrom, at),
      ),
    )
    .orderBy(
      desc(bookingWindowPolicyVersion.effectiveFrom),
      desc(bookingWindowPolicyVersion.version),
    );
  return rows.map(bookingVersionView);
}

async function getWaitlistVersions(
  tx: SchedulingTransaction,
  ids: string[],
  at: Date,
) {
  if (ids.length === 0) return [];
  const rows = await tx
    .select()
    .from(waitlistPolicyVersion)
    .where(
      and(
        inArray(waitlistPolicyVersion.policyId, ids),
        lte(waitlistPolicyVersion.effectiveFrom, at),
      ),
    )
    .orderBy(
      desc(waitlistPolicyVersion.effectiveFrom),
      desc(waitlistPolicyVersion.version),
    );
  return rows.map(waitlistVersionView);
}
