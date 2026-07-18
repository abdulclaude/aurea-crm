import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { studioMembership } from "@/db/schema";

import { requireHistoricalStripeConnection } from "./stripe-connection-binding";
import type { CommerceTransaction } from "./stripe-event-receipt";
import type { subscriptionSchema } from "./stripe-object-contracts";

type StripeSubscription = z.infer<typeof subscriptionSchema>;

export async function applySubscriptionState(input: {
  tx: CommerceTransaction;
  subscription: StripeSubscription;
  eventType: "customer.subscription.updated" | "customer.subscription.deleted";
  eventAccountId: string | null;
  occurredAt: Date;
}): Promise<{
  organizationId: string;
  locationId: string | null;
  stripeConnectionId: string;
} | null> {
  const [membership] = await input.tx
    .select({
      id: studioMembership.id,
      organizationId: studioMembership.organizationId,
      locationId: studioMembership.locationId,
      stripeConnectionId: studioMembership.stripeConnectionId,
      paymentFailureAt: studioMembership.paymentFailureAt,
      paymentGraceEndsAt: studioMembership.paymentGraceEndsAt,
    })
    .from(studioMembership)
    .where(eq(studioMembership.stripeSubscriptionId, input.subscription.id))
    .for("update");
  if (!membership?.organizationId) return null;

  const connection = await requireHistoricalStripeConnection({
    tx: input.tx,
    stripeConnectionId: membership.stripeConnectionId,
    organizationId: membership.organizationId,
    locationId: membership.locationId,
    eventAccountId: input.eventAccountId,
  });

  const deleted = input.eventType === "customer.subscription.deleted";
  const status = deleted
    ? "CANCELLED"
    : mapMembershipStatus(input.subscription.status);
  await input.tx
    .update(studioMembership)
    .set({
      status,
      cancelledAt: deleted || status === "CANCELLED" ? input.occurredAt : null,
      cancelReason:
        deleted || status === "CANCELLED"
          ? "Stripe subscription cancelled"
          : null,
      paymentFailureAt:
        status === "PAST_DUE"
          ? (membership.paymentFailureAt ?? input.occurredAt)
          : status === "ACTIVE"
            ? null
            : membership.paymentFailureAt,
      paymentGraceEndsAt:
        status === "ACTIVE" ? null : membership.paymentGraceEndsAt,
      updatedAt: new Date(),
    })
    .where(eq(studioMembership.id, membership.id));

  return {
    organizationId: membership.organizationId,
    locationId: membership.locationId,
    stripeConnectionId: connection.id,
  };
}

function mapMembershipStatus(
  status: string,
): "ACTIVE" | "PAST_DUE" | "INACTIVE" | "CANCELLED" | "PAUSED" {
  if (status === "active" || status === "trialing") return "ACTIVE";
  if (status === "paused") return "PAUSED";
  if (status === "past_due" || status === "unpaid") return "PAST_DUE";
  if (status === "canceled" || status === "incomplete_expired") {
    return "CANCELLED";
  }
  return "INACTIVE";
}
