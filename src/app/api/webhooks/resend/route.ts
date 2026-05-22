import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { campaign, campaignRecipient, client } from "@/db/schema";
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
    const recipient = await db.query.campaignRecipient.findFirst({
      where: eq(campaignRecipient.resendEmailId, emailId),
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
        await db.transaction(async (tx) => {
          await tx
            .update(campaignRecipient)
            .set({
              status: "DELIVERED",
              deliveredAt: now,
              updatedAt: now,
            })
            .where(eq(campaignRecipient.id, recipient.id));
          await tx
            .update(campaign)
            .set({ delivered: sql`${campaign.delivered} + 1`, updatedAt: now })
            .where(eq(campaign.id, campaignId));
        });
        break;

      case "email.opened":
        // Only count first open
        if (!recipient.openedAt) {
          await db.transaction(async (tx) => {
            await tx
              .update(campaignRecipient)
              .set({
                status: "OPENED",
                openedAt: now,
                updatedAt: now,
              })
              .where(eq(campaignRecipient.id, recipient.id));
            await tx
              .update(campaign)
              .set({ opened: sql`${campaign.opened} + 1`, updatedAt: now })
              .where(eq(campaign.id, campaignId));
          });
        }
        break;

      case "email.clicked":
        // Only count first click
        if (!recipient.clickedAt) {
          await db.transaction(async (tx) => {
            await tx
              .update(campaignRecipient)
              .set({
                status: "CLICKED",
                clickedAt: now,
                updatedAt: now,
              })
              .where(eq(campaignRecipient.id, recipient.id));
            await tx
              .update(campaign)
              .set({ clicked: sql`${campaign.clicked} + 1`, updatedAt: now })
              .where(eq(campaign.id, campaignId));
          });
        }
        break;

      case "email.bounced":
        await db.transaction(async (tx) => {
          await tx
            .update(campaignRecipient)
            .set({
              status: "BOUNCED",
              bouncedAt: now,
              updatedAt: now,
            })
            .where(eq(campaignRecipient.id, recipient.id));
          await tx
            .update(campaign)
            .set({ bounced: sql`${campaign.bounced} + 1`, updatedAt: now })
            .where(eq(campaign.id, campaignId));
        });
        break;

      case "email.complained":
        await db.transaction(async (tx) => {
          await tx
            .update(campaignRecipient)
            .set({
              status: "COMPLAINED",
              updatedAt: now,
            })
            .where(eq(campaignRecipient.id, recipient.id));
          await tx
            .update(campaign)
            .set({ complained: sql`${campaign.complained} + 1`, updatedAt: now })
            .where(eq(campaign.id, campaignId));
          await tx
            .update(client)
            .set({
              emailUnsubscribed: true,
              emailUnsubscribedAt: now,
              updatedAt: now,
            })
            .where(eq(client.id, recipient.clientId));
        });
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
