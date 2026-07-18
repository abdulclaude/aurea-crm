import { createId } from "@paralleldrive/cuid2";
import { and, eq, isNull, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import {
  campaign,
  campaignRecipient,
  client,
  communicationSuppression,
  unsubscribeToken,
} from "@/db/schema";
import { normalizeDeliveryDestination } from "@/features/delivery/lib/normalization";

const unsubscribeBodySchema = z.object({ token: z.string().min(1) });

type UnsubscribeResult =
  | { kind: "NOT_FOUND" }
  | { kind: "EXPIRED" }
  | { kind: "SUCCESS"; alreadyUsed: boolean };

export async function POST(request: NextRequest) {
  let rawBody: unknown;
  const queryToken = request.nextUrl.searchParams.get("token");
  if (queryToken) {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/x-www-form-urlencoded")) {
      return NextResponse.json(
        { success: false, error: "Invalid one-click request" },
        { status: 400 },
      );
    }
    const body = await request.text();
    const oneClick = new URLSearchParams(body).get("List-Unsubscribe");
    if (oneClick !== "One-Click") {
      return NextResponse.json(
        { success: false, error: "Invalid one-click request" },
        { status: 400 },
      );
    }
    rawBody = { token: queryToken };
  } else {
    try {
      rawBody = (await request.json()) as unknown;
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 },
      );
    }
  }
  const parsedBody = unsubscribeBodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      { success: false, error: "Token is required" },
      { status: 400 },
    );
  }

  try {
    const result: UnsubscribeResult = await db.transaction(async (tx) => {
      const [record] = await tx
        .select({
          token: unsubscribeToken,
          customer: {
            id: client.id,
            organizationId: client.organizationId,
            locationId: client.locationId,
            email: client.email,
            phone: client.phone,
          },
        })
        .from(unsubscribeToken)
        .innerJoin(client, eq(unsubscribeToken.clientId, client.id))
        .where(eq(unsubscribeToken.token, parsedBody.data.token))
        .limit(1)
        .for("update");
      if (!record) return { kind: "NOT_FOUND" };

      const alreadyUsed = Boolean(record.token.usedAt);
      if (!alreadyUsed && record.token.expiresAt < new Date()) {
        return { kind: "EXPIRED" };
      }

      const channel = record.token.channel ?? "EMAIL";
      const destination =
        channel === "EMAIL"
          ? record.customer.email
          : channel === "SMS" || channel === "VOICE"
            ? record.customer.phone
            : record.customer.id;
      if (!destination) {
        throw new Error("Unsubscribe destination is unavailable");
      }
      const destinationNormalized = normalizeDeliveryDestination(
        channel === "VOICE" ? "SMS" : channel,
        destination,
      );
      const now = new Date();

      await tx
        .insert(communicationSuppression)
        .values({
          id: createId(),
          organizationId:
            record.token.organizationId ?? record.customer.organizationId,
          locationId: record.token.locationId ?? record.customer.locationId,
          clientId: record.customer.id,
          channel,
          scope: record.token.suppressionScope ?? "MARKETING",
          reason: "UNSUBSCRIBE",
          destinationNormalized,
          sourceDeliveryId: record.token.deliveryId,
          activeAt: record.token.usedAt ?? now,
          updatedAt: now,
        })
        .onConflictDoNothing();

      if (channel === "EMAIL") {
        await tx
          .update(client)
          .set({
            emailUnsubscribed: true,
            emailUnsubscribedAt: record.token.usedAt ?? now,
            updatedAt: now,
          })
          .where(
            and(
              eq(client.id, record.customer.id),
              eq(client.organizationId, record.customer.organizationId),
            ),
          );
      }

      if (!alreadyUsed) {
        await tx
          .update(unsubscribeToken)
          .set({ usedAt: now })
          .where(
            and(
              eq(unsubscribeToken.id, record.token.id),
              isNull(unsubscribeToken.usedAt),
            ),
          );
      }

      if (record.token.campaignId) {
        const recipientWhere = record.token.deliveryId
          ? eq(campaignRecipient.deliveryId, record.token.deliveryId)
          : and(
              eq(campaignRecipient.campaignId, record.token.campaignId),
              eq(campaignRecipient.clientId, record.customer.id),
              isNull(campaignRecipient.unsubscribedAt),
            );
        const updatedRecipients = await tx
          .update(campaignRecipient)
          .set({
            status: "UNSUBSCRIBED",
            unsubscribedAt: now,
            updatedAt: now,
          })
          .where(and(recipientWhere, isNull(campaignRecipient.unsubscribedAt)))
          .returning({ id: campaignRecipient.id });

        if (updatedRecipients.length > 0) {
          await tx
            .update(campaign)
            .set({
              unsubscribed: sql`${campaign.unsubscribed} + 1`,
              updatedAt: now,
            })
            .where(eq(campaign.id, record.token.campaignId));
        }
      }

      return { kind: "SUCCESS", alreadyUsed };
    });

    if (result.kind === "NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: "Invalid unsubscribe link" },
        { status: 404 },
      );
    }
    if (result.kind === "EXPIRED") {
      return NextResponse.json(
        { success: false, error: "This unsubscribe link has expired" },
        { status: 410 },
      );
    }
    return NextResponse.json({
      success: true,
      message: result.alreadyUsed
        ? "You are already unsubscribed"
        : "Successfully unsubscribed",
    });
  } catch (error) {
    console.error("Failed to process unsubscribe request", {
      error:
        error instanceof Error ? error.message : "Unknown unsubscribe error",
    });
    return NextResponse.json(
      { success: false, error: "An error occurred while unsubscribing" },
      { status: 500 },
    );
  }
}
