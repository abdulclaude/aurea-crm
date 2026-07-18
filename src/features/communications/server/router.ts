import "server-only";

import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import {
  communicationProvisioningOperation,
  communicationPhoneNumberQuote,
  communicationUsageLedger,
  communicationWebhookReceipt,
  emailDomain,
  twilioPhoneNumber,
  twilioComplianceRegistration,
  voiceCall,
} from "@/db/schema";
import {
  archiveCommunicationRuleSchema,
  cloneCommunicationRuleSchema,
  communicationControlsListSchema,
  communicationProfileUpdateSchema,
  createCommunicationRuleSchema,
  createCommunicationSuppressionSchema,
  createMailboxBlocklistEntrySchema,
  previewCommunicationRuleSchema,
  revokeCommunicationSuppressionSchema,
  revokeMailboxBlocklistEntrySchema,
  versionCommunicationRuleSchema,
} from "@/features/communications/contracts";
import {
  communicationProvisioningSafeInputSchema,
  outboundVoiceCallSchema,
  twilioNumberPurchaseSchema,
  twilioNumberSearchSchema,
  voiceForwardingVerificationSchema,
  twilioComplianceRegistrationSchema,
} from "@/features/communications/contracts";
import {
  requireCapability,
  requireOrganizationCapability,
} from "@/features/permissions/server/authorization";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import {
  getOrCreateCommunicationProfile,
  applyTestingPlanAccess,
  updateCommunicationProfile,
  requireCommunicationEntitlement,
} from "./profile-service";
import { ensureTwilioPlatformBinding } from "./twilio-binding";
import { searchTwilioPhoneNumbers } from "./twilio-number-search";
import { requestCommunicationProvisioning } from "./provisioning";
import { enqueueOutboundVoiceCall } from "./voice-call-service";
import {
  confirmForwardingNumberVerification,
  requestForwardingNumberVerification,
} from "./voice-forwarding-verification";
import { z } from "zod";
import { recordCommunicationAudit } from "./audit";
import { resolveTwilioPlatformAccount } from "./twilio-client";
import { applyTwilioVoiceStatus } from "./twilio-voice-application";
import { releaseVoiceSpendReservation } from "./voice-spend-policy";
import { inngest } from "@/inngest/client";
import { renderCommunicationRuleContent } from "../lib/rule-rendering";
import {
  archiveCommunicationRule,
  cloneCommunicationRule,
  createCommunicationRule,
  createCommunicationSuppression,
  createMailboxBlocklistEntry,
  listCommunicationRules,
  listCommunicationSuppressions,
  listMailboxBlocklistEntries,
  revokeCommunicationSuppression,
  revokeMailboxBlocklistEntry,
  versionCommunicationRule,
} from "./control-service";

type CommunicationsContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

async function authorize(
  ctx: CommunicationsContext,
  capability:
    | "messaging.view"
    | "messaging.manage"
    | "provider.manage"
    | "voice.call"
    | "voice.recording.view",
): Promise<string> {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before managing communications.",
    });
  }
  await requireCapability({
    actor: {
      userId: ctx.auth.user.id,
      organizationId: ctx.orgId,
      locationId: ctx.locationId,
    },
    capability,
  });
  return ctx.orgId;
}

async function authorizeOrganizationManagement(
  ctx: CommunicationsContext,
): Promise<string> {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before managing communications.",
    });
  }
  await requireOrganizationCapability({
    actor: {
      userId: ctx.auth.user.id,
      organizationId: ctx.orgId,
      locationId: ctx.locationId,
    },
    capability: "provider.manage",
  });
  return ctx.orgId;
}

function locationCondition(locationId: string | null) {
  return locationId
    ? eq(emailDomain.locationId, locationId)
    : isNull(emailDomain.locationId);
}

export const communicationsRouter = createTRPCRouter({
  listRules: protectedProcedure
    .input(communicationControlsListSchema)
    .query(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "messaging.view");
      return listCommunicationRules({
        scope: { organizationId, locationId: ctx.locationId ?? null },
        ...input,
      });
    }),

  createRule: protectedProcedure
    .input(createCommunicationRuleSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "messaging.manage");
      const result = await createCommunicationRule({
        scope: { organizationId, locationId: ctx.locationId ?? null },
        actorUserId: ctx.auth.user.id,
        values: input,
      });
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "communications.rule.created",
        resourceType: "COMMUNICATION_RULE",
        resourceId: result.rule.id,
        safeMetadata: { eventKey: result.rule.eventKey, channel: result.rule.channel },
      });
      return result;
    }),

  versionRule: protectedProcedure
    .input(versionCommunicationRuleSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "messaging.manage");
      const result = await versionCommunicationRule({
        scope: { organizationId, locationId: ctx.locationId ?? null },
        actorUserId: ctx.auth.user.id,
        ...input,
      });
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "communications.rule.versioned",
        resourceType: "COMMUNICATION_RULE",
        resourceId: result.rule.id,
        safeMetadata: { version: result.version.version },
      });
      return result;
    }),

  cloneRule: protectedProcedure
    .input(cloneCommunicationRuleSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "messaging.manage");
      const result = await cloneCommunicationRule({
        scope: { organizationId, locationId: ctx.locationId ?? null },
        actorUserId: ctx.auth.user.id,
        ...input,
      });
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "communications.rule.cloned",
        resourceType: "COMMUNICATION_RULE",
        resourceId: result.rule.id,
        safeMetadata: { sourceRuleId: input.ruleId },
      });
      return result;
    }),

  archiveRule: protectedProcedure
    .input(archiveCommunicationRuleSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "messaging.manage");
      const rule = await archiveCommunicationRule({
        scope: { organizationId, locationId: ctx.locationId ?? null },
        actorUserId: ctx.auth.user.id,
        ruleId: input.ruleId,
      });
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "communications.rule.archived",
        resourceType: "COMMUNICATION_RULE",
        resourceId: rule.id,
      });
      return rule;
    }),

  previewRule: protectedProcedure
    .input(previewCommunicationRuleSchema)
    .mutation(async ({ ctx, input }) => {
      await authorize(ctx, "messaging.view");
      return renderCommunicationRuleContent(input);
    }),

  listSuppressions: protectedProcedure
    .input(communicationControlsListSchema)
    .query(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "messaging.view");
      return listCommunicationSuppressions({
        scope: { organizationId, locationId: ctx.locationId ?? null },
        ...input,
      });
    }),

  createSuppression: protectedProcedure
    .input(createCommunicationSuppressionSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "messaging.manage");
      const entry = await createCommunicationSuppression({
        scope: { organizationId, locationId: ctx.locationId ?? null },
        actorUserId: ctx.auth.user.id,
        channel: input.channel,
        suppressionScope: input.scope,
        reason: input.reason,
        destination: input.destination,
        expiresAt: input.expiresAt,
      });
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "communications.suppression.created",
        resourceType: "COMMUNICATION_SUPPRESSION",
        resourceId: entry.id,
        safeMetadata: { channel: entry.channel, reason: entry.reason },
      });
      return entry;
    }),

  revokeSuppression: protectedProcedure
    .input(revokeCommunicationSuppressionSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "messaging.manage");
      const entry = await revokeCommunicationSuppression({
        scope: { organizationId, locationId: ctx.locationId ?? null },
        actorUserId: ctx.auth.user.id,
        id: input.id,
      });
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "communications.suppression.revoked",
        resourceType: "COMMUNICATION_SUPPRESSION",
        resourceId: entry.id,
      });
      return entry;
    }),

  listMailboxBlocklist: protectedProcedure
    .input(communicationControlsListSchema)
    .query(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "messaging.view");
      return listMailboxBlocklistEntries({
        scope: { organizationId, locationId: ctx.locationId ?? null },
        ...input,
      });
    }),

  createMailboxBlock: protectedProcedure
    .input(createMailboxBlocklistEntrySchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "messaging.manage");
      const entry = await createMailboxBlocklistEntry({
        scope: { organizationId, locationId: ctx.locationId ?? null },
        actorUserId: ctx.auth.user.id,
        ...input,
      });
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "communications.mailbox_block.created",
        resourceType: "MAILBOX_BLOCKLIST_ENTRY",
        resourceId: entry.id,
        safeMetadata: { matchType: entry.matchType },
      });
      return entry;
    }),

  revokeMailboxBlock: protectedProcedure
    .input(revokeMailboxBlocklistEntrySchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "messaging.manage");
      const entry = await revokeMailboxBlocklistEntry({
        scope: { organizationId, locationId: ctx.locationId ?? null },
        actorUserId: ctx.auth.user.id,
        id: input.id,
      });
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "communications.mailbox_block.revoked",
        resourceType: "MAILBOX_BLOCKLIST_ENTRY",
        resourceId: entry.id,
      });
      return entry;
    }),

  overview: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = await authorizeOrganizationManagement(ctx);
    const [
      profile,
      domains,
      phoneNumbers,
      compliance,
      operations,
      webhookFailures,
      usage,
    ] = await Promise.all([
      getOrCreateCommunicationProfile(organizationId),
      db.query.emailDomain.findMany({
        where: and(
          eq(emailDomain.organizationId, organizationId),
          locationCondition(ctx.locationId),
        ),
        orderBy: [desc(emailDomain.createdAt)],
      }),
      db.query.twilioPhoneNumber.findMany({
        where: and(
          eq(twilioPhoneNumber.organizationId, organizationId),
          ctx.locationId
            ? eq(twilioPhoneNumber.locationId, ctx.locationId)
            : isNull(twilioPhoneNumber.locationId),
        ),
        orderBy: [desc(twilioPhoneNumber.createdAt)],
      }),
      db.query.twilioComplianceRegistration.findMany({
        where: eq(twilioComplianceRegistration.organizationId, organizationId),
        orderBy: [desc(twilioComplianceRegistration.updatedAt)],
      }),
      db
        .select({
          id: communicationProvisioningOperation.id,
          service: communicationProvisioningOperation.service,
          operationType: communicationProvisioningOperation.operationType,
          status: communicationProvisioningOperation.status,
          lastErrorCode: communicationProvisioningOperation.lastErrorCode,
          lastErrorMessage: communicationProvisioningOperation.lastErrorMessage,
          createdAt: communicationProvisioningOperation.createdAt,
          updatedAt: communicationProvisioningOperation.updatedAt,
        })
        .from(communicationProvisioningOperation)
        .where(
          and(
            eq(
              communicationProvisioningOperation.organizationId,
              organizationId,
            ),
            ctx.locationId
              ? eq(
                  communicationProvisioningOperation.locationId,
                  ctx.locationId,
                )
              : isNull(communicationProvisioningOperation.locationId),
          ),
        )
        .orderBy(desc(communicationProvisioningOperation.createdAt))
        .limit(25),
      db
        .select({
          id: communicationWebhookReceipt.id,
          provider: communicationWebhookReceipt.provider,
          eventType: communicationWebhookReceipt.eventType,
          status: communicationWebhookReceipt.status,
          attemptCount: communicationWebhookReceipt.attemptCount,
          lastErrorCode: communicationWebhookReceipt.lastErrorCode,
          lastErrorMessage: communicationWebhookReceipt.lastErrorMessage,
          receivedAt: communicationWebhookReceipt.receivedAt,
        })
        .from(communicationWebhookReceipt)
        .where(
          and(
            eq(communicationWebhookReceipt.organizationId, organizationId),
            inArray(communicationWebhookReceipt.status, [
              "FAILED",
              "DEAD_LETTER",
            ]),
          ),
        )
        .orderBy(desc(communicationWebhookReceipt.receivedAt))
        .limit(25),
      db
        .select({
          currency: communicationUsageLedger.currency,
          providerCost: sql<string>`coalesce(sum(CASE WHEN ${communicationUsageLedger.entryKind} = 'RELEASE' THEN -${communicationUsageLedger.providerCost} ELSE ${communicationUsageLedger.providerCost} END), 0)::text`,
          customerCharge: sql<string>`coalesce(sum(CASE WHEN ${communicationUsageLedger.entryKind} = 'RELEASE' THEN -${communicationUsageLedger.customerCharge} ELSE ${communicationUsageLedger.customerCharge} END), 0)::text`,
        })
        .from(communicationUsageLedger)
        .where(
          and(
            eq(communicationUsageLedger.organizationId, organizationId),
            ctx.locationId
              ? eq(communicationUsageLedger.locationId, ctx.locationId)
              : isNull(communicationUsageLedger.locationId),
            eq(
              communicationUsageLedger.billingPeriod,
              new Date().toISOString().slice(0, 7),
            ),
          ),
        )
        .groupBy(communicationUsageLedger.currency),
    ]);
    return {
      profile: {
        ...applyTestingPlanAccess(profile),
        voiceForwardingVerificationHash: undefined,
      },
      domains,
      phoneNumbers,
      compliance,
      operations,
      webhookFailures,
      currentMonthUsage: usage,
    };
  }),

  updateProfile: protectedProcedure
    .input(communicationProfileUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorizeOrganizationManagement(ctx);
      const updated = await updateCommunicationProfile({
        organizationId,
        settings: input,
      });
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "communications.profile.updated",
        resourceType: "COMMUNICATION_PROFILE",
        resourceId: updated.id,
      });
      return updated;
    }),

  listVoiceCalls: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = await authorize(ctx, "voice.call");
    return db
      .select({
        id: voiceCall.id,
        clientId: voiceCall.clientId,
        direction: voiceCall.direction,
        status: voiceCall.status,
        fromNumber: voiceCall.fromNumber,
        toNumber: voiceCall.toNumber,
        durationSeconds: voiceCall.durationSeconds,
        providerCost: voiceCall.providerCost,
        providerCostCurrency: voiceCall.providerCostCurrency,
        customerCharge: voiceCall.customerCharge,
        currency: voiceCall.currency,
        recordingAvailable: sql<boolean>`${voiceCall.recordingProviderId} IS NOT NULL AND ${voiceCall.recordingDeletedAt} IS NULL`,
        providerCallId: voiceCall.providerCallId,
        failureCode: voiceCall.failureCode,
        failureMessage: voiceCall.failureMessage,
        createdAt: voiceCall.createdAt,
      })
      .from(voiceCall)
      .where(
        and(
          eq(voiceCall.organizationId, organizationId),
          ctx.locationId
            ? eq(voiceCall.locationId, ctx.locationId)
            : isNull(voiceCall.locationId),
        ),
      )
      .orderBy(desc(voiceCall.createdAt))
      .limit(50);
  }),

  provisionTwilio: protectedProcedure.mutation(async ({ ctx }) => {
    const organizationId = await authorizeOrganizationManagement(ctx);
    const profile = applyTestingPlanAccess(
      await getOrCreateCommunicationProfile(organizationId),
    );
    if (!profile.smsEntitledAt && !profile.voiceEntitledAt) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "SMS or voice must be included in the active plan.",
      });
    }
    const binding = await ensureTwilioPlatformBinding({
      organizationId,
      createdByUserId: ctx.auth.user.id,
    });
    await recordCommunicationAudit({
      organizationId,
      locationId: ctx.locationId ?? null,
      actorUserId: ctx.auth.user.id,
      action: "twilio.subaccount.requested",
      resourceType: "PROVIDER_ACCOUNT",
      resourceId: binding.id,
    });
    return {
      id: binding.id,
      provider: binding.provider,
      status: binding.status,
      displayName: binding.displayName,
      externalAccountId: binding.externalAccountId,
      lastHealthCheckAt: binding.lastHealthCheckAt,
      lastErrorCode: binding.lastErrorCode,
    };
  }),

  searchPhoneNumbers: protectedProcedure
    .input(twilioNumberSearchSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "provider.manage");
      if (input.capabilities.sms) {
        await requireCommunicationEntitlement({
          organizationId,
          channel: "SMS",
        });
      }
      if (input.capabilities.voice) {
        await requireCommunicationEntitlement({
          organizationId,
          channel: "VOICE",
        });
      }
      return searchTwilioPhoneNumbers({
        organizationId,
        locationId: ctx.locationId ?? null,
        userId: ctx.auth.user.id,
        search: input,
      });
    }),

  purchasePhoneNumber: protectedProcedure
    .input(twilioNumberPurchaseSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "provider.manage");
      const now = new Date();
      const phoneNumberId = createId();
      const operationId = createId();
      const result = await db.transaction(async (tx) => {
        const operationKey = `twilio-number:purchase:${input.idempotencyKey}`;
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext(${`${organizationId}:${operationKey}`}))`,
        );
        const [existingOperation] = await tx
          .select()
          .from(communicationProvisioningOperation)
          .where(
            and(
              eq(
                communicationProvisioningOperation.organizationId,
                organizationId,
              ),
              eq(
                communicationProvisioningOperation.idempotencyKey,
                operationKey,
              ),
              ctx.locationId
                ? eq(
                    communicationProvisioningOperation.locationId,
                    ctx.locationId,
                  )
                : isNull(communicationProvisioningOperation.locationId),
            ),
          )
          .limit(1);
        if (existingOperation) {
          const safeInput = communicationProvisioningSafeInputSchema.parse(
            existingOperation.safeInput,
          );
          if (
            safeInput.kind !== "TWILIO_NUMBER_PURCHASE" ||
            safeInput.quoteId !== input.quoteId ||
            !existingOperation.phoneNumberId
          ) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "This idempotency key was already used for a different phone-number purchase.",
            });
          }
          const [existingPhone] = await tx
            .select()
            .from(twilioPhoneNumber)
            .where(
              and(
                eq(twilioPhoneNumber.id, existingOperation.phoneNumberId),
                eq(twilioPhoneNumber.organizationId, organizationId),
              ),
            )
            .limit(1);
          if (!existingPhone) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "The existing phone-number purchase is inconsistent.",
            });
          }
          return {
            phone: existingPhone,
            operationId: existingOperation.id,
            created: false,
          };
        }
        const [quote] = await tx
          .select()
          .from(communicationPhoneNumberQuote)
          .where(
            and(
              eq(communicationPhoneNumberQuote.id, input.quoteId),
              eq(communicationPhoneNumberQuote.organizationId, organizationId),
              ctx.locationId
                ? eq(communicationPhoneNumberQuote.locationId, ctx.locationId)
                : isNull(communicationPhoneNumberQuote.locationId),
              isNull(communicationPhoneNumberQuote.consumedAt),
              gt(communicationPhoneNumberQuote.expiresAt, now),
            ),
          )
          .limit(1)
          .for("update");
        if (!quote) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "The verified phone-number quote has expired.",
          });
        }
        const [phone] = await tx
          .insert(twilioPhoneNumber)
          .values({
            id: phoneNumberId,
            organizationId,
            locationId: ctx.locationId ?? null,
            providerAccountId: quote.providerAccountId,
            providerPhoneNumberId: `pending:${quote.id}`,
            phoneNumber: quote.phoneNumber,
            country: quote.country,
            numberType: quote.numberType,
            smsEnabled: quote.smsEnabled,
            voiceEnabled: quote.voiceEnabled,
            status: "PROVISIONING",
            monthlyProviderCost: quote.monthlyProviderCost,
            currency: quote.currency,
            purchaseConfirmedAt: now,
            updatedAt: now,
          })
          .returning();
        await tx.insert(communicationProvisioningOperation).values({
          id: operationId,
          organizationId,
          locationId: ctx.locationId ?? null,
          providerAccountId: quote.providerAccountId,
          phoneNumberId,
          service: "TWILIO_PHONE_NUMBER",
          operationType: "PURCHASE",
          idempotencyKey: operationKey,
          safeInput: { kind: "TWILIO_NUMBER_PURCHASE", quoteId: quote.id },
          requestedByUserId: ctx.auth.user.id,
          nextAttemptAt: now,
          maxAttempts: 720,
        });
        return { phone, operationId, created: true };
      });
      await requestCommunicationProvisioning(organizationId);
      if (result.created)
        await recordCommunicationAudit({
          organizationId,
          locationId: ctx.locationId ?? null,
          actorUserId: ctx.auth.user.id,
          action: "twilio.number.purchase_requested",
          resourceType: "TWILIO_PHONE_NUMBER",
          resourceId: result.phone?.id ?? null,
          safeMetadata: { quoteId: input.quoteId },
        });
      return { phoneNumber: result.phone, operationId: result.operationId };
    }),

  saveComplianceRegistration: protectedProcedure
    .input(twilioComplianceRegistrationSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorizeOrganizationManagement(ctx);
      const binding = await ensureTwilioPlatformBinding({
        organizationId,
        createdByUserId: ctx.auth.user.id,
      });
      if (binding.status !== "ACTIVE") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Wait for managed Twilio provisioning to finish.",
        });
      }
      const now = new Date();
      const operationId = createId();
      const registration = await db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ id: twilioComplianceRegistration.id })
          .from(twilioComplianceRegistration)
          .where(
            and(
              eq(twilioComplianceRegistration.organizationId, organizationId),
              eq(twilioComplianceRegistration.providerAccountId, binding.id),
              eq(twilioComplianceRegistration.country, input.country),
              eq(twilioComplianceRegistration.channel, input.channel),
              eq(twilioComplianceRegistration.programType, input.programType),
              eq(twilioComplianceRegistration.numberType, input.numberType),
            ),
          )
          .limit(1);
        const registrationId = existing?.id ?? createId();
        const [saved] = existing
          ? await tx
              .update(twilioComplianceRegistration)
              .set({
                ...input,
                status: "PENDING",
                providerStatus: null,
                approvedAt: null,
                submittedAt: now,
                updatedAt: now,
              })
              .where(eq(twilioComplianceRegistration.id, registrationId))
              .returning()
          : await tx
              .insert(twilioComplianceRegistration)
              .values({
                id: registrationId,
                organizationId,
                providerAccountId: binding.id,
                ...input,
                status: "PENDING",
                submittedAt: now,
                updatedAt: now,
              })
              .returning();
        await tx.insert(communicationProvisioningOperation).values({
          id: operationId,
          organizationId,
          providerAccountId: binding.id,
          service: "TWILIO_COMPLIANCE",
          operationType: "RECONCILE",
          idempotencyKey: `twilio-compliance:${registrationId}:${now.getTime()}`,
          safeInput: {
            kind: "TWILIO_COMPLIANCE_VERIFY",
            registrationId,
          },
          requestedByUserId: ctx.auth.user.id,
          nextAttemptAt: now,
        });
        return saved;
      });
      await requestCommunicationProvisioning(organizationId);
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "twilio.compliance.verification_requested",
        resourceType: "TWILIO_COMPLIANCE",
        resourceId: registration?.id ?? null,
      });
      return { registration, operationId };
    }),

  setDefaultPhoneNumber: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "provider.manage");
      const result = await db.transaction(async (tx) => {
        const [owned] = await tx
          .select()
          .from(twilioPhoneNumber)
          .where(
            and(
              eq(twilioPhoneNumber.id, input.id),
              eq(twilioPhoneNumber.organizationId, organizationId),
              ctx.locationId
                ? eq(twilioPhoneNumber.locationId, ctx.locationId)
                : isNull(twilioPhoneNumber.locationId),
              eq(twilioPhoneNumber.status, "ACTIVE"),
            ),
          )
          .limit(1);
        if (!owned) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Active phone number not found in this workspace.",
          });
        }
        await tx
          .update(twilioPhoneNumber)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(
            and(
              eq(twilioPhoneNumber.organizationId, organizationId),
              ctx.locationId
                ? eq(twilioPhoneNumber.locationId, ctx.locationId)
                : isNull(twilioPhoneNumber.locationId),
            ),
          );
        const [updated] = await tx
          .update(twilioPhoneNumber)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(eq(twilioPhoneNumber.id, owned.id))
          .returning();
        return updated;
      });
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "twilio.number.default_changed",
        resourceType: "TWILIO_PHONE_NUMBER",
        resourceId: result?.id ?? null,
      });
      return result;
    }),

  releasePhoneNumber: protectedProcedure
    .input(z.object({ id: z.string().min(1), confirmRelease: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "provider.manage");
      const profile = await getOrCreateCommunicationProfile(organizationId);
      if (profile.numberReleaseGraceDays === null) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Configure the number release grace period before scheduling a release.",
        });
      }
      const releaseAt = new Date(
        Date.now() + profile.numberReleaseGraceDays * 86_400_000,
      );
      const operationId = createId();
      const [phone] = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(twilioPhoneNumber)
          .set({
            status: "RELEASE_SCHEDULED",
            isDefault: false,
            releaseScheduledAt: releaseAt,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(twilioPhoneNumber.id, input.id),
              eq(twilioPhoneNumber.organizationId, organizationId),
              ctx.locationId
                ? eq(twilioPhoneNumber.locationId, ctx.locationId)
                : isNull(twilioPhoneNumber.locationId),
              eq(twilioPhoneNumber.status, "ACTIVE"),
            ),
          )
          .returning();
        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Active phone number not found in this workspace.",
          });
        }
        await tx.insert(communicationProvisioningOperation).values({
          id: operationId,
          organizationId,
          locationId: ctx.locationId ?? null,
          providerAccountId: updated.providerAccountId,
          phoneNumberId: updated.id,
          service: "TWILIO_PHONE_RELEASE",
          operationType: "RELEASE",
          idempotencyKey: `twilio-number:release:${updated.id}:${releaseAt.toISOString()}`,
          safeInput: {
            kind: "TWILIO_NUMBER_RELEASE",
            phoneNumberId: updated.id,
          },
          requestedByUserId: ctx.auth.user.id,
          nextAttemptAt: releaseAt,
        });
        return [updated];
      });
      await requestCommunicationProvisioning(organizationId);
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "twilio.number.release_scheduled",
        resourceType: "TWILIO_PHONE_NUMBER",
        resourceId: phone?.id ?? null,
        safeMetadata: { releaseAt: releaseAt.toISOString() },
      });
      return { phoneNumber: phone, operationId, releaseAt };
    }),

  cancelPhoneNumberRelease: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "provider.manage");
      const phone = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(twilioPhoneNumber)
          .set({
            status: "ACTIVE",
            releaseScheduledAt: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(twilioPhoneNumber.id, input.id),
              eq(twilioPhoneNumber.organizationId, organizationId),
              ctx.locationId
                ? eq(twilioPhoneNumber.locationId, ctx.locationId)
                : isNull(twilioPhoneNumber.locationId),
              eq(twilioPhoneNumber.status, "RELEASE_SCHEDULED"),
            ),
          )
          .returning();
        if (!updated) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This number release can no longer be cancelled.",
          });
        }
        await tx
          .update(communicationProvisioningOperation)
          .set({
            status: "CANCELLED",
            nextAttemptAt: null,
            claimToken: null,
            leaseExpiresAt: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(communicationProvisioningOperation.phoneNumberId, updated.id),
              eq(
                communicationProvisioningOperation.service,
                "TWILIO_PHONE_RELEASE",
              ),
              inArray(communicationProvisioningOperation.status, [
                "PENDING",
                "RETRYABLE_FAILURE",
                "AMBIGUOUS",
              ]),
            ),
          );
        return updated;
      });
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "twilio.number.release_cancelled",
        resourceType: "TWILIO_PHONE_NUMBER",
        resourceId: phone.id,
      });
      return phone;
    }),

  startVoiceCall: protectedProcedure
    .input(outboundVoiceCallSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "voice.call");
      const call = await enqueueOutboundVoiceCall({
        organizationId,
        locationId: ctx.locationId ?? null,
        clientId: input.clientId,
        idempotencyKey: input.idempotencyKey,
      });
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "voice.call.requested",
        resourceType: "VOICE_CALL",
        resourceId: call.id,
      });
      return call;
    }),

  retryOperation: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx, "provider.manage");
      const [operation] = await db
        .update(communicationProvisioningOperation)
        .set({
          status: "PENDING",
          nextAttemptAt: new Date(),
          claimToken: null,
          leaseExpiresAt: null,
          lastErrorCode: null,
          lastErrorMessage: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(communicationProvisioningOperation.id, input.id),
            eq(
              communicationProvisioningOperation.organizationId,
              organizationId,
            ),
            ctx.locationId
              ? eq(
                  communicationProvisioningOperation.locationId,
                  ctx.locationId,
                )
              : isNull(communicationProvisioningOperation.locationId),
            inArray(communicationProvisioningOperation.status, [
              "FAILED",
              "AMBIGUOUS",
              "RETRYABLE_FAILURE",
            ]),
          ),
        )
        .returning();
      if (!operation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Retryable communications operation not found.",
        });
      }
      await requestCommunicationProvisioning(organizationId);
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "communications.operation.retried",
        resourceType: "PROVISIONING_OPERATION",
        resourceId: operation.id,
      });
      return operation;
    }),

  replayWebhookReceipt: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorizeOrganizationManagement(ctx);
      const [receipt] = await db
        .update(communicationWebhookReceipt)
        .set({
          status: "PENDING",
          attemptCount: 0,
          claimToken: null,
          leaseExpiresAt: null,
          processedAt: null,
          lastErrorCode: null,
          lastErrorMessage: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(communicationWebhookReceipt.id, input.id),
            eq(communicationWebhookReceipt.organizationId, organizationId),
            inArray(communicationWebhookReceipt.status, [
              "FAILED",
              "DEAD_LETTER",
            ]),
          ),
        )
        .returning({
          id: communicationWebhookReceipt.id,
          provider: communicationWebhookReceipt.provider,
        });
      if (!receipt) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Replayable webhook receipt not found.",
        });
      }
      await inngest.send({
        name:
          receipt.provider === "RESEND"
            ? "communications/resend-webhook.received"
            : "communications/twilio-webhook.received",
        id: `communications-webhook-replay:${receipt.id}:${Date.now()}`,
        data: { receiptId: receipt.id },
      });
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "communications.webhook.replayed",
        resourceType: "WEBHOOK_RECEIPT",
        resourceId: receipt.id,
      });
      return receipt;
    }),

  resolveAmbiguousVoiceCall: protectedProcedure
    .input(
      z.discriminatedUnion("resolution", [
        z.object({
          id: z.string().min(1),
          resolution: z.literal("NOT_CREATED"),
        }),
        z.object({
          id: z.string().min(1),
          resolution: z.literal("CORRELATE"),
          providerCallSid: z.string().regex(/^CA[a-fA-F0-9]{32}$/),
        }),
      ]),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorizeOrganizationManagement(ctx);
      const [call] = await db
        .select()
        .from(voiceCall)
        .where(
          and(
            eq(voiceCall.id, input.id),
            eq(voiceCall.organizationId, organizationId),
            isNull(voiceCall.providerCallId),
            inArray(voiceCall.failureCode, [
              "TWILIO_CALL_CREATE_AMBIGUOUS",
              "TWILIO_CALL_RECONCILIATION_REQUIRED",
            ]),
          ),
        )
        .limit(1);
      if (!call) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ambiguous voice call not found.",
        });
      }
      if (input.resolution === "NOT_CREATED") {
        await db.transaction(async (tx) => {
          const [updated] = await tx
            .update(voiceCall)
            .set({
              failureCode: "TWILIO_CALL_NOT_CREATED",
              failureMessage: "An operator confirmed no provider call exists.",
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(voiceCall.id, call.id),
                isNull(voiceCall.providerCallId),
                inArray(voiceCall.failureCode, [
                  "TWILIO_CALL_CREATE_AMBIGUOUS",
                  "TWILIO_CALL_RECONCILIATION_REQUIRED",
                ]),
              ),
            )
            .returning({ id: voiceCall.id });
          if (!updated) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "The voice call was resolved by another operator.",
            });
          }
          await releaseVoiceSpendReservation({
            tx,
            organizationId,
            voiceCallId: call.id,
            reason: "operator-confirmed-not-created",
            at: new Date(),
          });
        });
      } else {
        const binding = await resolveTwilioPlatformAccount({ organizationId });
        if (!binding.client || binding.account.id !== call.providerAccountId) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "The managed Twilio account is not available.",
          });
        }
        const remote = await binding.client
          .calls(input.providerCallSid)
          .fetch();
        const remoteCreatedAt = remote.dateCreated?.getTime();
        const matching =
          remote.from === call.fromNumber &&
          remote.to === call.forwardingNumber &&
          remoteCreatedAt !== undefined &&
          remoteCreatedAt >= call.createdAt.getTime() - 60_000 &&
          remoteCreatedAt <= call.createdAt.getTime() + 10 * 60_000;
        if (!matching) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "That provider call does not match the ambiguous request.",
          });
        }
        const [updated] = await db
          .update(voiceCall)
          .set({
            providerCallId: remote.sid,
            failureCode: null,
            failureMessage: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(voiceCall.id, call.id),
              isNull(voiceCall.providerCallId),
              inArray(voiceCall.failureCode, [
                "TWILIO_CALL_CREATE_AMBIGUOUS",
                "TWILIO_CALL_RECONCILIATION_REQUIRED",
              ]),
            ),
          )
          .returning({ id: voiceCall.id });
        if (!updated) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "The voice call was resolved by another operator.",
          });
        }
        await applyTwilioVoiceStatus({
          providerEventId: `operator-reconcile:${remote.sid}:${remote.status}`,
          providerAccountId: call.providerAccountId,
          organizationId,
          occurredAt: remote.endTime ?? remote.dateUpdated ?? new Date(),
          event: {
            AccountSid: remote.accountSid,
            CallSid: remote.sid,
            CallStatus: remote.status,
            CallDuration: remote.duration ?? undefined,
          },
        });
      }
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "voice.call.reconciled",
        resourceType: "VOICE_CALL",
        resourceId: call.id,
        safeMetadata: { resolution: input.resolution },
      });
      return { id: call.id, resolution: input.resolution };
    }),

  requestForwardingVerification: protectedProcedure.mutation(
    async ({ ctx }) => {
      const organizationId = await authorizeOrganizationManagement(ctx);
      const result = await requestForwardingNumberVerification({
        organizationId,
        locationId: ctx.locationId ?? null,
      });
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "voice.forwarding.verification_requested",
        resourceType: "COMMUNICATION_PROFILE",
      });
      return result;
    },
  ),

  confirmForwardingVerification: protectedProcedure
    .input(voiceForwardingVerificationSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorizeOrganizationManagement(ctx);
      const profile = await confirmForwardingNumberVerification({
        organizationId,
        code: input.code,
      });
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "voice.forwarding.verified",
        resourceType: "COMMUNICATION_PROFILE",
        resourceId: profile?.id ?? null,
      });
      return profile;
    }),
});
