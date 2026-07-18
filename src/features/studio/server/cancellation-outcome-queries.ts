import { and, eq, inArray, or } from "drizzle-orm";

import {
  cancellationPolicy,
  client,
  studioBooking,
  studioClass,
} from "@/db/schema";

import { exactCancellationLocation } from "./cancellation-access";
import type { CancellationTransaction } from "./cancellation-domain-types";

export async function loadScopedCancellationBookings(
  tx: CancellationTransaction,
  input: {
    organizationId: string;
    locationId: string | null;
    bookingIds: string[];
  },
) {
  return tx
    .select({
      bookingId: studioBooking.id,
      status: studioBooking.status,
      classId: studioBooking.classId,
      clientId: studioBooking.clientId,
      cancellationPolicyId: studioClass.cancellationPolicyId,
      locationId: studioClass.locationId,
      className: studioClass.name,
      classStartTime: studioClass.startTime,
      clientName: client.name,
      clientEmail: client.email,
    })
    .from(studioBooking)
    .innerJoin(studioClass, eq(studioClass.id, studioBooking.classId))
    .innerJoin(client, eq(client.id, studioBooking.clientId))
    .where(
      and(
        inArray(studioBooking.id, input.bookingIds),
        eq(studioClass.organizationId, input.organizationId),
        exactCancellationLocation(studioClass.locationId, input.locationId),
        eq(client.organizationId, input.organizationId),
        exactCancellationLocation(client.locationId, input.locationId),
      ),
    )
    .for("update");
}

export async function loadApplicableCancellationPolicies(
  tx: CancellationTransaction,
  input: {
    organizationId: string;
    locationId: string | null;
    explicitIds: string[];
  },
) {
  const explicitIds = [...new Set(input.explicitIds)];
  return tx
    .select()
    .from(cancellationPolicy)
    .where(
      and(
        eq(cancellationPolicy.organizationId, input.organizationId),
        exactCancellationLocation(
          cancellationPolicy.locationId,
          input.locationId,
        ),
        or(
          explicitIds.length > 0
            ? inArray(cancellationPolicy.id, explicitIds)
            : undefined,
          and(
            eq(cancellationPolicy.isDefault, true),
            eq(cancellationPolicy.isActive, true),
          ),
        ),
      ),
    );
}
