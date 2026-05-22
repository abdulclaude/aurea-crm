/**
 * Stripe Webhook Handler for Booking Payments
 */

import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { booking } from "@/db/schema";
import { verifyStripeWebhook } from "@/lib/stripe";
import { createNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Stripe webhook secret not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const verification = verifyStripeWebhook(body, signature, webhookSecret);
  if (!verification.success) {
    return NextResponse.json({ error: verification.error }, { status: 400 });
  }

  const event = verification.event as Stripe.Event;

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId;

      if (!bookingId) {
        console.error("No booking ID in checkout session metadata");
        return NextResponse.json({ received: true });
      }

      const amountPaid = (session.amount_total || 0) / 100;
      const currency = (session.currency || "").toUpperCase() || undefined;

      await db
        .update(booking)
        .set({
          paid: true,
          paymentId: session.payment_intent as string,
          amount: amountPaid ? String(amountPaid) : undefined,
          currency,
          updatedAt: new Date(),
        })
        .where(eq(booking.id, bookingId));

      const paidBooking = await db.query.booking.findFirst({
        where: eq(booking.id, bookingId),
      });

      if (paidBooking) {
        await createNotification({
          type: "BOOKING_PAID",
          title: "Booking paid",
          message: `Payment received for booking ${paidBooking.title}.`,
          entityType: "booking",
          entityId: paidBooking.id,
          organizationId: paidBooking.organizationId,
          locationId: paidBooking.locationId ?? undefined,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing booking payment webhook:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
