import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";

import { db } from "@/db";
import {
  campaign,
  campaignRecipient,
  campaignRun,
  client,
  communicationSuppression,
  outboundDelivery,
  unsubscribeToken,
} from "@/db/schema";
import { getActiveScopedAudienceDefinition } from "@/features/audiences/server/audience-access";
import { campaignEmailContentSchema } from "@/features/campaigns/lib/email-content-schema";
import {
  getFirstName,
  renderCampaignEmail,
} from "@/features/campaigns/lib/render-email";
import {
  buildClientWhereClause,
  buildSavedAudienceWhereClause,
} from "@/features/campaigns/server/audience";
import { normalizeEmailDestination } from "@/features/delivery/lib/normalization";
import type { DeliveryPayload } from "@/features/delivery/lib/payload-schemas";
import { resolveEmailSender } from "@/features/delivery/server/email-sender";

const INSERT_BATCH_SIZE = 250;
const UNSUBSCRIBE_TOKEN_LIFETIME_MS = 365 * 24 * 60 * 60_000;

type PrepareCampaignRunInput = {
  campaignId: string;
  organizationId: string;
  locationId: string | null;
  requestedBy: string;
  mode: "IMMEDIATE" | "SCHEDULED";
  scheduledFor?: Date;
};

type PreparedRecipient = {
  recipientId: string;
  deliveryId: string;
  tokenId: string;
  token: string;
  tokenHash: string;
  clientId: string;
  email: string;
  destinationNormalized: string;
  invalidDestination: boolean;
  payload: DeliveryPayload;
};

export type PreparedCampaignRun = {
  runId: string;
  totalRecipients: number;
  queued: number;
  suppressed: number;
  failed: number;
  scheduledFor: Date | null;
};

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function getAppBaseUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function prepareCampaignRun(
  input: PrepareCampaignRunInput,
): Promise<PreparedCampaignRun> {
  const selectedCampaign = await db.query.campaign.findFirst({
    where: and(
      eq(campaign.id, input.campaignId),
      eq(campaign.organizationId, input.organizationId),
      input.locationId
        ? eq(campaign.locationId, input.locationId)
        : isNull(campaign.locationId),
    ),
  });
  if (!selectedCampaign) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
  }

  const allowedStatus =
    input.mode === "SCHEDULED"
      ? selectedCampaign.status === "DRAFT"
      : selectedCampaign.status === "DRAFT" ||
        selectedCampaign.status === "SCHEDULED";
  if (!allowedStatus) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This campaign cannot be queued from its current status",
    });
  }
  if (input.mode === "SCHEDULED" && !input.scheduledFor) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A scheduled campaign requires a send time",
    });
  }

  const content = campaignEmailContentSchema.safeParse(
    selectedCampaign.content,
  );
  if (!content.success) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Campaign content is invalid and must be corrected before sending",
    });
  }
  const sender = await resolveEmailSender({
    organizationId: input.organizationId,
    locationId: input.locationId,
    emailDomainId: selectedCampaign.emailDomainId,
    fromName: selectedCampaign.fromName,
    fromEmail: selectedCampaign.fromEmail,
    replyTo: selectedCampaign.replyTo,
    purpose: "MARKETING",
  });
  const savedAudience = selectedCampaign.savedAudienceId
    ? await getActiveScopedAudienceDefinition({
        id: selectedCampaign.savedAudienceId,
        scope: {
          organizationId: input.organizationId,
          locationId: input.locationId,
        },
      })
    : null;
  const audience = await db
    .select({
      id: client.id,
      name: client.name,
      email: client.email,
      companyName: client.companyName,
    })
    .from(client)
    .where(
      savedAudience
        ? buildSavedAudienceWhereClause({
            organizationId: input.organizationId,
            locationId: input.locationId,
            definition: savedAudience.definition,
          })
        : buildClientWhereClause(
            input.organizationId,
            input.locationId,
            selectedCampaign.segmentType,
            selectedCampaign.segmentFilter,
          ),
    );
  if (audience.length === 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The selected campaign audience has no emailable recipients",
    });
  }

  const baseUrl = getAppBaseUrl();
  const preparedRecipients = await Promise.all(
    audience.map(async (recipient): Promise<PreparedRecipient> => {
      if (!recipient.email) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Campaign audience contains a recipient without an email address",
        });
      }
      const recipientId = createId();
      const deliveryId = createId();
      const token = randomBytes(32).toString("base64url");
      let destinationNormalized = recipient.email.trim().toLowerCase();
      let invalidDestination = false;
      try {
        destinationNormalized = normalizeEmailDestination(recipient.email);
      } catch {
        invalidDestination = true;
      }
      const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
      const rendered = await renderCampaignEmail({
        content: content.data,
        variables: {
          name: recipient.name,
          firstName: getFirstName(recipient.name),
          email: recipient.email,
          companyName: recipient.companyName ?? undefined,
          unsubscribe_url: unsubscribeUrl,
        },
      });

      return {
        recipientId,
        deliveryId,
        tokenId: createId(),
        token,
        tokenHash: hashToken(token),
        clientId: recipient.id,
        email: recipient.email,
        destinationNormalized,
        invalidDestination,
        payload: {
          channel: "EMAIL",
          subject: selectedCampaign.subject,
          html: rendered.html,
          text: rendered.text,
          replyTo: selectedCampaign.replyTo ?? undefined,
          unsubscribeUrl: `${baseUrl}/api/unsubscribe?token=${encodeURIComponent(token)}`,
        },
      };
    }),
  );

  const runId = createId();
  const availableAt = input.scheduledFor ?? new Date();
  const idempotencyKey = [
    selectedCampaign.id,
    selectedCampaign.updatedAt.toISOString(),
    input.mode,
    input.scheduledFor?.toISOString() ?? "immediate",
  ].join(":");

  return db.transaction(async (tx) => {
    const now = new Date();
    const locationScope = input.locationId
      ? or(
          isNull(communicationSuppression.locationId),
          eq(communicationSuppression.locationId, input.locationId),
        )
      : isNull(communicationSuppression.locationId);
    const suppressions = await tx
      .select({
        destinationNormalized: communicationSuppression.destinationNormalized,
        reason: communicationSuppression.reason,
      })
      .from(communicationSuppression)
      .where(
        and(
          eq(communicationSuppression.organizationId, input.organizationId),
          locationScope,
          eq(communicationSuppression.channel, "EMAIL"),
          inArray(
            communicationSuppression.destinationNormalized,
            preparedRecipients.map(
              (recipient) => recipient.destinationNormalized,
            ),
          ),
          lte(communicationSuppression.activeAt, now),
          isNull(communicationSuppression.revokedAt),
          or(
            isNull(communicationSuppression.expiresAt),
            gt(communicationSuppression.expiresAt, now),
          ),
        ),
      );
    const suppressionByDestination = new Map(
      suppressions.map((suppression) => [
        suppression.destinationNormalized,
        suppression.reason,
      ]),
    );
    const blockedRecipients = new Map<string, string>();
    for (const recipient of preparedRecipients) {
      const reason = recipient.invalidDestination
        ? "INVALID_DESTINATION"
        : suppressionByDestination.get(recipient.destinationNormalized);
      if (reason) {
        blockedRecipients.set(recipient.recipientId, reason);
      }
    }
    const failedCount = preparedRecipients.filter(
      (recipient) => recipient.invalidDestination,
    ).length;
    const suppressedCount = blockedRecipients.size - failedCount;
    const queuedCount = preparedRecipients.length - blockedRecipients.size;

    const [claimedCampaign] = await tx
      .update(campaign)
      .set({
        status: input.mode === "SCHEDULED" ? "SCHEDULED" : "QUEUED",
        scheduledAt: input.scheduledFor ?? null,
        totalRecipients: preparedRecipients.length,
        updatedAt: now,
      })
      .where(
        and(
          eq(campaign.id, selectedCampaign.id),
          eq(campaign.organizationId, input.organizationId),
          eq(campaign.updatedAt, selectedCampaign.updatedAt),
          input.mode === "SCHEDULED"
            ? eq(campaign.status, "DRAFT")
            : inArray(campaign.status, ["DRAFT", "SCHEDULED"]),
        ),
      )
      .returning({ id: campaign.id });
    if (!claimedCampaign) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "Campaign changed while it was being prepared. Review and try again.",
      });
    }

    await tx.insert(campaignRun).values({
      id: runId,
      campaignId: selectedCampaign.id,
      organizationId: input.organizationId,
      locationId: input.locationId,
      requestedBy: input.requestedBy,
      status:
        queuedCount > 0 ? "QUEUED" : failedCount > 0 ? "FAILED" : "COMPLETED",
      idempotencyKey,
      scheduledFor: input.scheduledFor ?? null,
      audienceSnapshot: {
        savedAudience: savedAudience
          ? {
              id: savedAudience.id,
              name: savedAudience.name,
              schemaVersion: savedAudience.schemaVersion,
              definition: savedAudience.definition,
            }
          : null,
        segmentType: selectedCampaign.segmentType,
        segmentFilter: selectedCampaign.segmentFilter,
        clientIds: preparedRecipients.map((recipient) => recipient.clientId),
      },
      contentSnapshot: {
        subject: selectedCampaign.subject,
        preheaderText: selectedCampaign.preheaderText,
        content: selectedCampaign.content,
        templateId: selectedCampaign.templateId,
        resendTemplateId: selectedCampaign.resendTemplateId,
      },
      senderSnapshot: sender,
      totalRecipients: preparedRecipients.length,
      queued: queuedCount,
      suppressed: suppressedCount,
      failed: failedCount,
      preparedAt: now,
      completedAt: queuedCount === 0 ? now : null,
      updatedAt: now,
    });

    for (const batch of chunk(preparedRecipients, INSERT_BATCH_SIZE)) {
      await tx.insert(outboundDelivery).values(
        batch.map((recipient) => {
          const suppressionReason = blockedRecipients.get(
            recipient.recipientId,
          );
          const invalidDestination = recipient.invalidDestination;
          return {
            id: recipient.deliveryId,
            organizationId: input.organizationId,
            locationId: input.locationId,
            clientId: recipient.clientId,
            channel: "EMAIL" as const,
            purpose: "MARKETING" as const,
            provider: "RESEND" as const,
            providerAccountId: sender.providerAccountRef,
            status: invalidDestination
              ? ("DEAD_LETTER" as const)
              : suppressionReason
                ? ("SUPPRESSED" as const)
                : ("QUEUED" as const),
            providerAccountRef: sender.providerAccountRef,
            sourceType: "CAMPAIGN_RECIPIENT",
            sourceId: recipient.recipientId,
            destination: recipient.email,
            destinationNormalized: recipient.destinationNormalized,
            senderRef: sender.sender,
            payload: recipient.payload,
            idempotencyKey: `${runId}:${recipient.clientId}:email`,
            availableAt,
            maxAttempts: 5,
            lastFailureClass: invalidDestination ? ("TERMINAL" as const) : null,
            lastErrorCode: suppressionReason ?? null,
            lastErrorMessage: suppressionReason
              ? "Delivery blocked while preparing the campaign audience"
              : null,
            updatedAt: now,
          };
        }),
      );
      await tx.insert(campaignRecipient).values(
        batch.map((recipient) => {
          const suppressionReason = blockedRecipients.get(
            recipient.recipientId,
          );
          return {
            id: recipient.recipientId,
            campaignId: selectedCampaign.id,
            clientId: recipient.clientId,
            runId,
            deliveryId: recipient.deliveryId,
            recipientAddress: recipient.destinationNormalized,
            suppressionReason: suppressionReason ?? null,
            status: suppressionReason
              ? recipient.invalidDestination
                ? ("FAILED" as const)
                : ("UNSUBSCRIBED" as const)
              : ("PENDING" as const),
            updatedAt: now,
          };
        }),
      );
      const deliverable = batch.filter(
        (recipient) => !blockedRecipients.has(recipient.recipientId),
      );
      if (deliverable.length > 0) {
        await tx.insert(unsubscribeToken).values(
          deliverable.map((recipient) => ({
            id: recipient.tokenId,
            organizationId: input.organizationId,
            locationId: input.locationId,
            clientId: recipient.clientId,
            campaignId: selectedCampaign.id,
            deliveryId: recipient.deliveryId,
            channel: "EMAIL" as const,
            suppressionScope: "MARKETING" as const,
            token: recipient.token,
            tokenHash: recipient.tokenHash,
            expiresAt: new Date(now.getTime() + UNSUBSCRIBE_TOKEN_LIFETIME_MS),
          })),
        );
      }
    }

    if (queuedCount === 0) {
      await tx
        .update(campaign)
        .set({
          status: failedCount > 0 ? "FAILED" : "SENT",
          sentAt: failedCount > 0 ? null : now,
          updatedAt: now,
        })
        .where(eq(campaign.id, selectedCampaign.id));
    }

    return {
      runId,
      totalRecipients: preparedRecipients.length,
      queued: queuedCount,
      suppressed: suppressedCount,
      failed: failedCount,
      scheduledFor: input.scheduledFor ?? null,
    };
  });
}
