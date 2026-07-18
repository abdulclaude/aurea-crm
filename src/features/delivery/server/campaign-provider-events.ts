import "server-only";

import { eq, sql } from "drizzle-orm";

import { campaign, campaignRecipient, campaignRun } from "@/db/schema";
import type { ProviderEventKind } from "@/features/delivery/contracts";
import type { DeliveryTransaction } from "@/features/delivery/server/outbox";

function getRecipientStatus(
  current: (typeof campaignRecipient.$inferSelect)["status"],
  kind: ProviderEventKind,
): (typeof campaignRecipient.$inferSelect)["status"] {
  if (kind === "COMPLAINED") return "COMPLAINED";
  if (current === "COMPLAINED" || current === "UNSUBSCRIBED") return current;
  if (kind === "BOUNCED") return "BOUNCED";
  if (current === "BOUNCED") return current;
  if (kind === "CLICKED") return "CLICKED";
  if (kind === "OPENED" && current !== "CLICKED") return "OPENED";
  if (kind === "DELIVERED" && (current === "PENDING" || current === "SENT")) {
    return "DELIVERED";
  }
  if ((kind === "SENT" || kind === "ACCEPTED") && current === "PENDING") {
    return "SENT";
  }
  return current;
}

export async function applyCampaignProviderEvent(
  tx: DeliveryTransaction,
  deliveryId: string,
  kind: ProviderEventKind | null,
  occurredAt: Date,
): Promise<void> {
  if (!kind) return;

  const [recipient] = await tx
    .select()
    .from(campaignRecipient)
    .where(eq(campaignRecipient.deliveryId, deliveryId))
    .limit(1)
    .for("update");
  if (!recipient) return;

  const firstDelivered = kind === "DELIVERED" && !recipient.deliveredAt;
  const firstOpened = kind === "OPENED" && !recipient.openedAt;
  const firstClicked = kind === "CLICKED" && !recipient.clickedAt;
  const firstBounced = kind === "BOUNCED" && !recipient.bouncedAt;
  const firstComplained = kind === "COMPLAINED" && !recipient.complainedAt;

  await tx
    .update(campaignRecipient)
    .set({
      status: getRecipientStatus(recipient.status, kind),
      deliveredAt: firstDelivered ? occurredAt : undefined,
      openedAt: firstOpened ? occurredAt : undefined,
      clickedAt: firstClicked ? occurredAt : undefined,
      bouncedAt: firstBounced ? occurredAt : undefined,
      complainedAt: firstComplained ? occurredAt : undefined,
      openCount:
        kind === "OPENED" ? sql`${campaignRecipient.openCount} + 1` : undefined,
      clickCount:
        kind === "CLICKED"
          ? sql`${campaignRecipient.clickCount} + 1`
          : undefined,
      updatedAt: new Date(),
    })
    .where(eq(campaignRecipient.id, recipient.id));

  const hasCampaignIncrement =
    firstDelivered ||
    firstOpened ||
    firstClicked ||
    firstBounced ||
    firstComplained;
  if (hasCampaignIncrement) {
    await tx
      .update(campaign)
      .set({
        delivered: sql`${campaign.delivered} + ${firstDelivered ? 1 : 0}`,
        opened: sql`${campaign.opened} + ${firstOpened ? 1 : 0}`,
        clicked: sql`${campaign.clicked} + ${firstClicked ? 1 : 0}`,
        bounced: sql`${campaign.bounced} + ${firstBounced ? 1 : 0}`,
        complained: sql`${campaign.complained} + ${firstComplained ? 1 : 0}`,
        updatedAt: new Date(),
      })
      .where(eq(campaign.id, recipient.campaignId));
  }

  if (recipient.runId && (firstDelivered || firstBounced)) {
    await tx
      .update(campaignRun)
      .set({
        delivered: sql`${campaignRun.delivered} + ${firstDelivered ? 1 : 0}`,
        bounced: sql`${campaignRun.bounced} + ${firstBounced ? 1 : 0}`,
        status: firstBounced
          ? sql`CASE
              WHEN ${campaignRun.status} IN ('COMPLETED', 'SENDING')
                THEN 'PARTIAL'::"CampaignRunStatus"
              ELSE ${campaignRun.status}
            END`
          : undefined,
        updatedAt: new Date(),
      })
      .where(eq(campaignRun.id, recipient.runId));
  }
}
