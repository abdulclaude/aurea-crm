/**
 * Stripe Webhook Handler for Invoice Payments
 * Processes Stripe checkout events for invoice payments
 */

import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invoice as invoiceTable, invoicePayment } from "@/db/schema";
import { InvoiceStatus } from "@/db/enums";
import { verifyStripeWebhook, handleCheckoutCompleted } from "@/lib/stripe";
import { sendPaymentConfirmationEmail } from "@/lib/email";
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

  // Verify webhook signature
  const verification = verifyStripeWebhook(body, signature, webhookSecret);
  if (!verification.success) {
    return NextResponse.json({ error: verification.error }, { status: 400 });
  }

  const event = verification.event as Stripe.Event;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Extract invoice payment data
        const paymentData = await handleCheckoutCompleted(session);
        if (!paymentData) {
          console.error("No payment data extracted from checkout session");
          break;
        }

        // Find invoice
        const invoice = await db.query.invoice.findFirst({
          where: eq(invoiceTable.id, paymentData.invoiceId),
        });

        if (!invoice) {
          console.error(`Invoice not found: ${paymentData.invoiceId}`);
          break;
        }

        // Record payment
        const amountPaid = paymentData.amountPaid / 100; // Convert from cents

        await db.transaction(async (tx) => {
          await tx.insert(invoicePayment).values({
              id: createId(),
              invoiceId: invoice.id,
              amount: String(amountPaid),
              currency: invoice.currency,
              method: "STRIPE",
              stripePaymentId: paymentData.paymentIntentId,
              paidAt: new Date(),
              updatedAt: new Date(),
          });

          const newAmountPaid = Number(invoice.amountPaid) + amountPaid;
          const newAmountDue = Number(invoice.total) - newAmountPaid;

          let newStatus = invoice.status;
          if (newAmountDue <= 0) {
            newStatus = InvoiceStatus.PAID;
          } else if (newAmountPaid > 0) {
            newStatus = InvoiceStatus.PARTIALLY_PAID;
          }

          await tx
            .update(invoiceTable)
            .set({
              amountPaid: String(newAmountPaid),
              amountDue: String(Math.max(0, newAmountDue)),
              status: newStatus,
              updatedAt: new Date(),
            })
            .where(eq(invoiceTable.id, invoice.id));
        });

        console.log(`Payment recorded for invoice ${invoice.invoiceNumber}: $${amountPaid}`);

        // Send payment confirmation email
        if (invoice.clientEmail) {
          try {
            await sendPaymentConfirmationEmail({
              to: invoice.clientEmail,
              invoiceNumber: invoice.invoiceNumber,
              clientName: invoice.clientName || "Valued Customer",
              amountPaid: amountPaid.toString(),
              currency: invoice.currency,
              paidAt: new Date(),
              paymentMethod: "Credit Card (Stripe)",
            });
            console.log(`Payment confirmation email sent to ${invoice.clientEmail}`);
          } catch (emailError) {
            console.error("Failed to send payment confirmation email:", emailError);
            // Don't fail the webhook if email fails
          }
        }

        await createNotification({
          type: "INVOICE_PAID",
          title: "Invoice paid",
          message: `Invoice ${invoice.invoiceNumber} has been paid.`,
          entityType: "invoice",
          entityId: invoice.id,
          organizationId: invoice.organizationId,
          locationId: invoice.locationId ?? undefined,
        });

        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment intent succeeded: ${paymentIntent.id}`);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error(`Payment failed: ${paymentIntent.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
