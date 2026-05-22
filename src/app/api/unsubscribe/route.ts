import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { CampaignRecipientStatus } from "@/db/enums";
import {
  campaign,
  campaignRecipient,
  client,
  unsubscribeToken as unsubscribeTokenTable,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

const UnsubscribeBodySchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsedBody = UnsubscribeBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const { token } = parsedBody.data;

    const [unsubscribeToken] = await db
      .select({
        token: unsubscribeTokenTable,
        client: {
          id: client.id,
          emailUnsubscribed: client.emailUnsubscribed,
        },
      })
      .from(unsubscribeTokenTable)
      .innerJoin(client, eq(unsubscribeTokenTable.clientId, client.id))
      .where(eq(unsubscribeTokenTable.token, token))
      .limit(1);

    if (!unsubscribeToken) {
      return NextResponse.json(
        { success: false, error: "Invalid unsubscribe link" },
        { status: 404 }
      );
    }

    // Check if token is expired
    if (unsubscribeToken.token.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "This unsubscribe link has expired" },
        { status: 410 }
      );
    }

    // Check if already used
    if (unsubscribeToken.token.usedAt) {
      return NextResponse.json(
        { success: false, error: "This link has already been used" },
        { status: 410 }
      );
    }

    // If already unsubscribed, just mark the token as used
    if (unsubscribeToken.client.emailUnsubscribed) {
      await db
        .update(unsubscribeTokenTable)
        .set({ usedAt: new Date() })
        .where(eq(unsubscribeTokenTable.token, token));

      return NextResponse.json({
        success: true,
        message: "You are already unsubscribed",
      });
    }

    await db.transaction(async (tx) => {
      const now = new Date();

      await tx
        .update(client)
        .set({
          emailUnsubscribed: true,
          emailUnsubscribedAt: now,
          updatedAt: now,
        })
        .where(eq(client.id, unsubscribeToken.token.clientId));

      await tx
        .update(unsubscribeTokenTable)
        .set({ usedAt: now })
        .where(eq(unsubscribeTokenTable.token, token));

      if (unsubscribeToken.token.campaignId) {
        await tx
          .update(campaign)
          .set({
            unsubscribed: sql`${campaign.unsubscribed} + 1`,
            updatedAt: now,
          })
          .where(eq(campaign.id, unsubscribeToken.token.campaignId));

        await tx
          .update(campaignRecipient)
          .set({
            status: CampaignRecipientStatus.UNSUBSCRIBED,
            unsubscribedAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(campaignRecipient.campaignId, unsubscribeToken.token.campaignId),
              eq(campaignRecipient.clientId, unsubscribeToken.token.clientId)
            )
          );
      }
    });

    return NextResponse.json({
      success: true,
      message: "Successfully unsubscribed",
    });
  } catch (error) {
    console.error("Error processing unsubscribe:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred while unsubscribing" },
      { status: 500 }
    );
  }
}
