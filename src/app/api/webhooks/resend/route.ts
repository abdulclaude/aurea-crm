import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Webhook } from "svix";

// Resend webhook event types
type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.complained"
  | "email.bounced"
  | "email.opened"
  | "email.clicked";

interface ResendWebhookPayload {
  type: ResendEventType;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // For click events
    click?: {
      link: string;
      timestamp: string;
    };
    // For bounce events
    bounce?: {
      message: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    
    if (webhookSecret) {
      const svixId = headers["svix-id"];
      const svixTimestamp = headers["svix-timestamp"];
      const svixSignature = headers["svix-signature"];

      if (!svixId || !svixTimestamp || !svixSignature) {
        console.error("Missing Svix headers");
        return NextResponse.json(
          { error: "Missing webhook signature headers" },
          { status: 400 }
        );
      }

      try {
        const wh = new Webhook(webhookSecret);
        wh.verify(body, {
          "svix-id": svixId,
          "svix-timestamp": svixTimestamp,
          "svix-signature": svixSignature,
        });
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 }
        );
      }
    }

    const payload = JSON.parse(body) as ResendWebhookPayload;
    const { type, data } = payload;
    const emailId = data.email_id;

    console.log(`Resend webhook received: ${type} for email ${emailId}`);

    // Find the campaign recipient by resendEmailId
    const recipient = await prisma.campaignRecipient.findFirst({
      where: { resendEmailId: emailId },
      include: {
        campaign: {
          select: { id: true },
        },
      },
    });

    if (!recipient) {
      // This might be an email not from a campaign (e.g., transactional)
      console.log(`No campaign recipient found for email ${emailId}`);
      return NextResponse.json({ received: true, processed: false });
    }

    const campaignId = recipient.campaignId;
    const now = new Date();

    // Process based on event type
    switch (type) {
      case "email.delivered":
        await prisma.$transaction([
          prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: "DELIVERED",
              deliveredAt: now,
            },
          }),
          prisma.campaign.update({
            where: { id: campaignId },
            data: {
              delivered: { increment: 1 },
            },
          }),
        ]);
        break;

      case "email.opened":
        // Only count first open
        if (!recipient.openedAt) {
          await prisma.$transaction([
            prisma.campaignRecipient.update({
              where: { id: recipient.id },
              data: {
                status: "OPENED",
                openedAt: now,
              },
            }),
            prisma.campaign.update({
              where: { id: campaignId },
              data: {
                opened: { increment: 1 },
              },
            }),
          ]);
        }
        break;

      case "email.clicked":
        // Only count first click
        if (!recipient.clickedAt) {
          await prisma.$transaction([
            prisma.campaignRecipient.update({
              where: { id: recipient.id },
              data: {
                status: "CLICKED",
                clickedAt: now,
              },
            }),
            prisma.campaign.update({
              where: { id: campaignId },
              data: {
                clicked: { increment: 1 },
              },
            }),
          ]);
        }
        break;

      case "email.bounced":
        await prisma.$transaction([
          prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: "BOUNCED",
              bouncedAt: now,
            },
          }),
          prisma.campaign.update({
            where: { id: campaignId },
            data: {
              bounced: { increment: 1 },
            },
          }),
        ]);
        break;

      case "email.complained":
        await prisma.$transaction([
          prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: "COMPLAINED",
            },
          }),
          prisma.campaign.update({
            where: { id: campaignId },
            data: {
              complained: { increment: 1 },
            },
          }),
          // Also unsubscribe the contact when they complain
          prisma.contact.update({
            where: { id: recipient.contactId },
            data: {
              emailUnsubscribed: true,
              emailUnsubscribedAt: now,
            },
          }),
        ]);
        break;

      case "email.delivery_delayed":
        // Just log, don't update status yet
        console.log(`Email ${emailId} delivery delayed`);
        break;

      case "email.sent":
        // Already tracked when we sent
        break;
    }

    return NextResponse.json({ received: true, processed: true });
  } catch (error) {
    console.error("Error processing Resend webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
