import { randomUUID } from "crypto";
import { eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { db } from "@/db";
import {
  classCredit,
  giftCard,
  membershipPlan,
  promoCode,
  stripeEvent,
  studioMembership,
  studioPayment,
} from "@/db/schema";
import { triggerStudioPaymentWorkflows } from "@/features/studio/server/payment-workflow-triggers";
import { inngest } from "@/inngest/client";
import { getStripeInstance } from "@/lib/stripe";

export const runtime = "nodejs";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type CreatedPayment = typeof studioPayment.$inferSelect;
type EventResult = {
  duplicate?: boolean;
  newMembershipId?: string;
  payments: CreatedPayment[];
};

async function handleEvent(tx: DbTransaction, event: Stripe.Event): Promise<Omit<EventResult, "duplicate">> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata;
      if (!meta?.planId || !meta?.clientId || !meta?.organizationId) {
        return { payments: [] };
      }

      const amountPence = session.amount_total ?? 0;
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : null;

      const plan = await tx.query.membershipPlan.findFirst({
        where: eq(membershipPlan.id, meta.planId),
      });
      if (!plan || plan.organizationId !== meta.organizationId) {
        return { payments: [] };
      }

      const membershipId = randomUUID();
      const [membership] = await tx
        .insert(studioMembership)
        .values({
          id: membershipId,
          updatedAt: new Date(),
          clientId: meta.clientId,
          organizationId: meta.organizationId,
          locationId: meta.locationId || null,
          planId: plan.id,
          name: plan.name,
          type: plan.type,
          status: "ACTIVE",
          startDate: new Date(),
          price: (amountPence / 100).toString(),
          currency: (session.currency ?? "gbp").toUpperCase(),
          stripeSubscriptionId:
            typeof session.subscription === "string" ? session.subscription : null,
          autoRenew: plan.billingInterval !== "ONE_TIME",
        })
        .returning();

      const [payment] = await tx
        .insert(studioPayment)
        .values({
          id: randomUUID(),
          organizationId: meta.organizationId,
          locationId: meta.locationId || null,
          clientId: meta.clientId,
          membershipId: membership.id,
          stripePaymentIntentId: paymentIntentId,
          stripeCustomerId:
            typeof session.customer === "string" ? session.customer : null,
          amount: String(amountPence / 100),
          currency: (session.currency ?? "gbp").toUpperCase(),
          status: "SUCCEEDED",
          type: "MEMBERSHIP",
          description: `Membership: ${plan.name}`,
          promoCodeId: meta.promoCodeId ?? null,
          updatedAt: new Date(),
        })
        .returning();

      const payments = [payment];

      if (meta.promoCodeId) {
        await tx
          .update(promoCode)
          .set({
            redemptionCount: sql`${promoCode.redemptionCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(promoCode.id, meta.promoCodeId));
      }

      const giftCardAmount = Number(meta.giftCardAmount ?? "0");
      if (meta.giftCardId && giftCardAmount > 0) {
        const card = await tx.query.giftCard.findFirst({
          where: eq(giftCard.id, meta.giftCardId),
          columns: { id: true, code: true, remainingBalance: true, currency: true },
        });

        if (card) {
          const nextBalance = Math.max(0, Number(card.remainingBalance) - giftCardAmount);
          await tx
            .update(giftCard)
            .set({
              remainingBalance: nextBalance.toFixed(2),
              isActive: nextBalance > 0,
              redeemedAt: nextBalance > 0 ? null : new Date(),
              redeemedByClientId: meta.clientId,
              updatedAt: new Date(),
            })
            .where(eq(giftCard.id, card.id));

          const [giftPayment] = await tx
            .insert(studioPayment)
            .values({
              id: randomUUID(),
              organizationId: meta.organizationId,
              locationId: meta.locationId || null,
              clientId: meta.clientId,
              membershipId: membership.id,
              amount: giftCardAmount.toFixed(2),
              currency: card.currency,
              status: "SUCCEEDED",
              type: "GIFT_CARD",
              description: `Gift card redemption: ${card.code}`,
              updatedAt: new Date(),
            })
            .returning();
          payments.push(giftPayment);
        }
      }

      if (plan.classCredits && plan.billingInterval === "ONE_TIME") {
        await tx.insert(classCredit).values({
          id: randomUUID(),
          membershipId: membership.id,
          clientId: meta.clientId,
          totalCredits: plan.classCredits,
          usedCredits: 0,
          updatedAt: new Date(),
        });
      }

      return { newMembershipId: membership.id, payments };
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionRaw = invoice.parent?.subscription_details?.subscription;
      const subscriptionId = typeof subscriptionRaw === "string" ? subscriptionRaw : subscriptionRaw?.id ?? null;
      if (!subscriptionId) {
        return { payments: [] };
      }

      const membership = await tx.query.studioMembership.findFirst({
        where: eq(studioMembership.stripeSubscriptionId, subscriptionId),
        columns: {
          id: true,
          organizationId: true,
          locationId: true,
          clientId: true,
        },
      });
      if (!membership?.organizationId) {
        return { payments: [] };
      }

      const [payment] = await tx
        .insert(studioPayment)
        .values({
          id: randomUUID(),
          organizationId: membership.organizationId,
          locationId: membership.locationId,
          clientId: membership.clientId,
          membershipId: membership.id,
          stripeCustomerId: typeof invoice.customer === "string" ? invoice.customer : null,
          amount: String(invoice.amount_paid / 100),
          currency: invoice.currency.toUpperCase(),
          status: "SUCCEEDED",
          type: "MEMBERSHIP",
          description: "Membership renewal",
          updatedAt: new Date(),
        })
        .returning();

      return { payments: [payment] };
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await tx
        .update(studioMembership)
        .set({
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: "Stripe subscription cancelled",
          updatedAt: new Date(),
        })
        .where(eq(studioMembership.stripeSubscriptionId, subscription.id));
      return { payments: [] };
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const renewalDate = subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000)
        : null;
      await tx
        .update(studioMembership)
        .set({
          status: "ACTIVE",
          renewalDate,
          updatedAt: new Date(),
        })
        .where(eq(studioMembership.stripeSubscriptionId, subscription.id));
      return { payments: [] };
    }

    default:
      return { payments: [] };
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const secret = process.env.STRIPE_MEMBERSHIP_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe-memberships] Webhook secret not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripeInstance().webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let result: EventResult;
  try {
    result = await db.transaction(async (tx) => {
      const [createdEvent] = await tx
        .insert(stripeEvent)
        .values({
          id: randomUUID(),
          stripeEventId: event.id,
          type: event.type,
        })
        .onConflictDoNothing({ target: stripeEvent.stripeEventId })
        .returning({ id: stripeEvent.id });

      if (!createdEvent) {
        return { duplicate: true, payments: [] };
      }

      return handleEvent(tx, event);
    });
  } catch (err) {
    console.error("[stripe-memberships] transaction failed", {
      eventId: event.id,
      type: event.type,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  if (result.duplicate) {
    return NextResponse.json({ received: true });
  }

  if (result.newMembershipId) {
    await inngest
      .send({ name: "studio/membership.created", data: { membershipId: result.newMembershipId } })
      .catch((err: unknown) => console.error("[stripe-memberships] failed to send Inngest event", err));
  }

  await Promise.all(
    result.payments.map((payment) =>
      triggerStudioPaymentWorkflows({ payment }).catch((err: unknown) =>
        console.error("[stripe-memberships] failed to trigger payment workflows", err),
      ),
    ),
  );

  return NextResponse.json({ received: true });
}
