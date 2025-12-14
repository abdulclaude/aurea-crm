/**
 * Stripe Webhook Handler for Invoice Payments
 * Processes Stripe checkout events for invoice payments
 */

import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/db";
import { InvoiceStatus } from "@prisma/client";
import { verifyStripeWebhook, handleCheckoutCompleted } from "@/lib/stripe";
import { sendPaymentConfirmationEmail } from "@/lib/email";

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
        const invoice = await prisma.invoice.findUnique({
          where: { id: paymentData.invoiceId },
        });

        if (!invoice) {
          console.error(`Invoice not found: ${paymentData.invoiceId}`);
          break;
        }

        // Record payment
        const amountPaid = paymentData.amountPaid / 100; // Convert from cents

        await prisma.$transaction(async (tx) => {
          // Create payment record
          await tx.invoicePayment.create({
            data: {
              id: crypto.randomUUID(),
              invoiceId: invoice.id,
              amount: amountPaid,
              currency: invoice.currency,
              method: "STRIPE",
              stripePaymentId: paymentData.paymentIntentId,
              paidAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          // Update invoice
          const newAmountPaid = parseFloat(invoice.amountPaid.toString()) + amountPaid;
          const newAmountDue = parseFloat(invoice.total.toString()) - newAmountPaid;

          let newStatus = invoice.status;
          if (newAmountDue <= 0) {
            newStatus = InvoiceStatus.PAID;
          } else if (newAmountPaid > 0) {
            newStatus = InvoiceStatus.PARTIALLY_PAID;
          }

          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              amountPaid: newAmountPaid,
              amountDue: Math.max(0, newAmountDue),
              status: newStatus,
            },
          });
        });

        console.log(`Payment recorded for invoice ${invoice.invoiceNumber}: $${amountPaid}`);

        // Send payment confirmation email
        if (invoice.contactEmail) {
          try {
            await sendPaymentConfirmationEmail({
              to: invoice.contactEmail,
              invoiceNumber: invoice.invoiceNumber,
              contactName: invoice.contactName || "Valued Customer",
              amountPaid: amountPaid.toString(),
              currency: invoice.currency,
              paidAt: new Date(),
              paymentMethod: "Credit Card (Stripe)",
            });
            console.log(`Payment confirmation email sent to ${invoice.contactEmail}`);
          } catch (emailError) {
            console.error("Failed to send payment confirmation email:", emailError);
            // Don't fail the webhook if email fails
          }
        }

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
