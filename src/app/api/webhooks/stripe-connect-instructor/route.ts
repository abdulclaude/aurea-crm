import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { db } from "@/db";
import { instructor, instructorPayout, stripeEvent } from "@/db/schema";
import { getStripeInstance } from "@/lib/stripe";

export const runtime = "nodejs";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getMetadataValue(object: unknown, key: string): string | null {
  if (!isRecord(object)) {
    return null;
  }
  const metadata = object.metadata;
  if (!isRecord(metadata)) {
    return null;
  }
  const value = metadata[key];
  return typeof value === "string" ? value : null;
}

async function handleConnectEvent(tx: DbTransaction, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "account.updated": {
      const account = event.data.object as Stripe.Account;

      const chargesEnabled = account.charges_enabled ?? false;
      const payoutsEnabled = account.payouts_enabled ?? false;
      const detailsSubmitted = account.details_submitted ?? false;

      await tx
        .update(instructor)
        .set({
          stripeOnboardingComplete: chargesEnabled && payoutsEnabled,
          stripeAccountStatus: chargesEnabled && payoutsEnabled
            ? "active"
            : detailsSubmitted
              ? "pending_verification"
              : "pending_onboarding",
          updatedAt: new Date(),
        })
        .where(eq(instructor.stripeAccountId, account.id));

      break;
    }

    case "transfer.created": {
      const transfer = event.data.object as Stripe.Transfer;
      if (!transfer.metadata?.instructorId) return;

      await tx
        .update(instructorPayout)
        .set({ status: "PROCESSING", updatedAt: new Date() })
        .where(eq(instructorPayout.stripeTransferId, transfer.id));

      break;
    }

    case "payout.paid": {
      const payout = event.data.object as Stripe.Payout;
      const accountId = event.account;
      if (!accountId) return;

      const targetInstructor = await tx.query.instructor.findFirst({
        where: eq(instructor.stripeAccountId, accountId),
        columns: { id: true },
      });
      if (!targetInstructor) return;

      await tx
        .update(instructorPayout)
        .set({
          status: "PAID",
          paidAt: new Date(payout.arrival_date * 1000),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(instructorPayout.instructorId, targetInstructor.id),
            eq(instructorPayout.status, "PROCESSING")
          )
        );

      break;
    }

    case "payout.failed": {
      const payout = event.data.object as Stripe.Payout;
      const accountId = event.account;
      if (!accountId) return;

      const targetInstructor = await tx.query.instructor.findFirst({
        where: eq(instructor.stripeAccountId, accountId),
        columns: { id: true },
      });
      if (!targetInstructor) return;

      await tx
        .update(instructorPayout)
        .set({ status: "FAILED", updatedAt: new Date() })
        .where(
          and(
            eq(instructorPayout.instructorId, targetInstructor.id),
            eq(instructorPayout.stripeTransferId, payout.id)
          )
        );

      break;
    }

    default:
      break;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe-connect-instructor] Webhook secret not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripeInstance().webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const inserted = await db.transaction(async (tx) => {
      const [createdEvent] = await tx
        .insert(stripeEvent)
        .values({
          id: randomUUID(),
          stripeEventId: event.id,
          type: event.type,
          organizationId: getMetadataValue(event.data.object, "organizationId"),
          locationId: getMetadataValue(event.data.object, "locationId"),
        })
        .onConflictDoNothing({ target: stripeEvent.stripeEventId })
        .returning({ id: stripeEvent.id });

      if (!createdEvent) return false;

      await handleConnectEvent(tx, event);
      return true;
    });

    if (!inserted) {
      return NextResponse.json({ received: true });
    }
  } catch (err) {
    console.error("[stripe-connect-instructor] transaction failed", {
      eventId: event.id,
      type: event.type,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
