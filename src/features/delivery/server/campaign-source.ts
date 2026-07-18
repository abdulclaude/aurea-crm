import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { campaign, campaignRecipient, campaignRun } from "@/db/schema";
import type { DeliveryTransaction } from "@/features/delivery/server/outbox";

type CampaignDispatchOutcome = "ACCEPTED" | "FAILED" | "SUPPRESSED" | "UNKNOWN";

export async function recordCampaignDispatchOutcome(
  tx: DeliveryTransaction,
  deliveryId: string,
  outcome: CampaignDispatchOutcome,
  errorCode?: string | null,
): Promise<void> {
  const now = new Date();
  if (outcome === "UNKNOWN") {
    const [recipient] = await tx
      .select({
        runId: campaignRecipient.runId,
        campaignId: campaignRecipient.campaignId,
      })
      .from(campaignRecipient)
      .where(eq(campaignRecipient.deliveryId, deliveryId))
      .limit(1);

    if (!recipient?.runId) {
      return;
    }

    await tx
      .update(campaignRun)
      .set({ status: "SENDING", startedAt: now, updatedAt: now })
      .where(eq(campaignRun.id, recipient.runId));
    await tx
      .update(campaign)
      .set({ status: "SENDING", updatedAt: now })
      .where(eq(campaign.id, recipient.campaignId));
    return;
  }

  const [recipient] = await tx
    .update(campaignRecipient)
    .set({
      status:
        outcome === "ACCEPTED"
          ? "SENT"
          : outcome === "SUPPRESSED"
            ? "UNSUBSCRIBED"
            : "FAILED",
      suppressionReason:
        outcome === "SUPPRESSED" ? (errorCode ?? "SUPPRESSED") : null,
      updatedAt: now,
    })
    .where(
      and(
        eq(campaignRecipient.deliveryId, deliveryId),
        eq(campaignRecipient.status, "PENDING"),
      ),
    )
    .returning({
      runId: campaignRecipient.runId,
      campaignId: campaignRecipient.campaignId,
    });

  if (!recipient?.runId) {
    return;
  }

  const acceptedIncrement = outcome === "ACCEPTED" ? 1 : 0;
  const failedIncrement = outcome === "FAILED" ? 1 : 0;
  const suppressedIncrement = outcome === "SUPPRESSED" ? 1 : 0;
  const [run] = await tx
    .update(campaignRun)
    .set({
      queued: sql`greatest(${campaignRun.queued} - 1, 0)`,
      accepted: sql`${campaignRun.accepted} + ${acceptedIncrement}`,
      failed: sql`${campaignRun.failed} + ${failedIncrement}`,
      suppressed: sql`${campaignRun.suppressed} + ${suppressedIncrement}`,
      status: sql`CASE
        WHEN ${campaignRun.queued} <= 1 THEN
          CASE
            WHEN (${campaignRun.accepted} + ${acceptedIncrement}) = 0
              AND (${campaignRun.failed} + ${failedIncrement}) > 0
              THEN 'FAILED'::"CampaignRunStatus"
            WHEN (${campaignRun.accepted} + ${acceptedIncrement}) > 0
              AND (${campaignRun.failed} + ${failedIncrement} + ${campaignRun.suppressed} + ${suppressedIncrement}) > 0
              THEN 'PARTIAL'::"CampaignRunStatus"
            ELSE 'COMPLETED'::"CampaignRunStatus"
          END
        ELSE 'SENDING'::"CampaignRunStatus"
      END`,
      startedAt: sql`coalesce(${campaignRun.startedAt}, ${now})`,
      completedAt: sql`CASE WHEN ${campaignRun.queued} <= 1 THEN ${now} ELSE ${campaignRun.completedAt} END`,
      updatedAt: now,
    })
    .where(
      and(eq(campaignRun.id, recipient.runId), sql`${campaignRun.queued} > 0`),
    )
    .returning({
      queued: campaignRun.queued,
      status: campaignRun.status,
    });

  if (!run) {
    return;
  }

  await tx
    .update(campaign)
    .set({
      status:
        run.queued === 0
          ? run.status === "FAILED"
            ? "FAILED"
            : "SENT"
          : "SENDING",
      sentAt: run.queued === 0 ? now : null,
      updatedAt: now,
    })
    .where(eq(campaign.id, recipient.campaignId));
}
