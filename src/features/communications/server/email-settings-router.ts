import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, ne, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import {
  emailDesignProfile,
  emailDomain,
  emailSenderAddress,
} from "@/db/schema";
import {
  createEmailSenderAddressSchema,
  emailDesignSettingsSchema,
  emailTestSendSchema,
  updateEmailSenderAddressSchema,
} from "@/features/communications/email-settings-contracts";
import { renderCampaignEmail } from "@/features/campaigns/lib/render-email";
import { enqueueEmail } from "@/features/delivery/server/transactional-email";
import { requireCapability } from "@/features/permissions/server/authorization";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { z } from "zod";

import { recordCommunicationAudit } from "./audit";
import { getEmailDesignState } from "./email-design-service";

type EmailSettingsContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

export const emailSettingsRouter = createTRPCRouter({
  listSenderAddresses: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = await authorize(ctx);
    return db
      .select({
        id: emailSenderAddress.id,
        emailDomainId: emailSenderAddress.emailDomainId,
        email: emailSenderAddress.email,
        displayName: emailSenderAddress.displayName,
        replyTo: emailSenderAddress.replyTo,
        isDefault: emailSenderAddress.isDefault,
        isDisabled: emailSenderAddress.isDisabled,
        createdAt: emailSenderAddress.createdAt,
        updatedAt: emailSenderAddress.updatedAt,
        domain: emailDomain.domain,
        domainStatus: emailDomain.status,
        domainLifecycleState: emailDomain.lifecycleState,
        domainDisabled: emailDomain.isDisabled,
      })
      .from(emailSenderAddress)
      .innerJoin(
        emailDomain,
        and(
          eq(emailDomain.id, emailSenderAddress.emailDomainId),
          eq(emailDomain.organizationId, emailSenderAddress.organizationId),
        ),
      )
      .where(
        and(
          senderScopeWhere(organizationId, ctx.locationId ?? null),
          isNull(emailSenderAddress.removedAt),
        ),
      )
      .orderBy(
        desc(emailSenderAddress.isDefault),
        emailSenderAddress.email,
      );
  }),

  listApprovedSenderChoices: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = await authorizeMessaging(ctx);
    return db
      .select({
        id: emailSenderAddress.id,
        emailDomainId: emailSenderAddress.emailDomainId,
        email: emailSenderAddress.email,
        displayName: emailSenderAddress.displayName,
        isDefault: emailSenderAddress.isDefault,
        domainStatus: emailDomain.status,
        domainLifecycleState: emailDomain.lifecycleState,
      })
      .from(emailSenderAddress)
      .innerJoin(
        emailDomain,
        and(
          eq(emailDomain.id, emailSenderAddress.emailDomainId),
          eq(emailDomain.organizationId, emailSenderAddress.organizationId),
        ),
      )
      .where(
        and(
          senderChoiceScopeWhere(organizationId, ctx.locationId ?? null),
          eq(emailSenderAddress.isDisabled, false),
          isNull(emailSenderAddress.removedAt),
          eq(emailDomain.status, "VERIFIED"),
          eq(emailDomain.lifecycleState, "ACTIVE"),
          eq(emailDomain.isDisabled, false),
          isNull(emailDomain.verificationStaleAt),
          isNull(emailDomain.removedAt),
        ),
      )
      .orderBy(
        desc(emailSenderAddress.isDefault),
        ctx.locationId
          ? sql`CASE WHEN ${emailSenderAddress.locationId} = ${ctx.locationId} THEN 0 ELSE 1 END`
          : sql`0`,
        emailSenderAddress.email,
      );
  }),

  createSenderAddress: protectedProcedure
    .input(createEmailSenderAddressSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx);
      const domain = await requireOwnedDomain({
        organizationId,
        locationId: ctx.locationId ?? null,
        id: input.emailDomainId,
      });
      validateAddressDomain(input.email, domain.domain);
      const now = new Date();
      const created = await db.transaction(async (tx) => {
        const [duplicate] = await tx
          .select({ id: emailSenderAddress.id })
          .from(emailSenderAddress)
          .where(
            and(
              senderScopeWhere(organizationId, ctx.locationId ?? null),
              sql`lower(${emailSenderAddress.email}) = ${input.email}`,
              isNull(emailSenderAddress.removedAt),
            ),
          )
          .limit(1);
        if (duplicate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This sender address already exists in the workspace.",
          });
        }
        const [existing] = await tx
          .select({ id: emailSenderAddress.id })
          .from(emailSenderAddress)
          .where(
            and(
              senderScopeWhere(organizationId, ctx.locationId ?? null),
              isNull(emailSenderAddress.removedAt),
            ),
          )
          .limit(1);
        const isDefault = input.isDefault || !existing;
        if (isDefault) {
          await clearDefaultSender(
            tx,
            organizationId,
            ctx.locationId ?? null,
            now,
          );
        }
        const [row] = await tx
          .insert(emailSenderAddress)
          .values({
            id: createId(),
            organizationId,
            locationId: ctx.locationId ?? null,
            emailDomainId: domain.id,
            email: input.email,
            displayName: input.displayName,
            replyTo: input.replyTo,
            isDefault,
            createdByUserId: ctx.auth.user.id,
            updatedAt: now,
          })
          .returning();
        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "The sender address could not be created.",
          });
        }
        if (isDefault) await syncDomainDefault(tx, row, now);
        return row;
      });
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "email.sender_address.created",
        resourceType: "EMAIL_SENDER_ADDRESS",
        resourceId: created.id,
        safeMetadata: { domainId: created.emailDomainId },
      });
      return created;
    }),

  updateSenderAddress: protectedProcedure
    .input(updateEmailSenderAddressSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx);
      const current = await requireOwnedAddress(
        organizationId,
        ctx.locationId ?? null,
        input.id,
      );
      const domain = await requireOwnedDomain({
        organizationId,
        locationId: ctx.locationId ?? null,
        id: input.emailDomainId,
      });
      validateAddressDomain(input.email, domain.domain);
      if (input.isDefault && input.isDisabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A disabled sender address cannot be the default.",
        });
      }
      const now = new Date();
      const updated = await db.transaction(async (tx) => {
        const [duplicate] = await tx
          .select({ id: emailSenderAddress.id })
          .from(emailSenderAddress)
          .where(
            and(
              senderScopeWhere(organizationId, ctx.locationId ?? null),
              ne(emailSenderAddress.id, current.id),
              sql`lower(${emailSenderAddress.email}) = ${input.email}`,
              isNull(emailSenderAddress.removedAt),
            ),
          )
          .limit(1);
        if (duplicate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This sender address already exists in the workspace.",
          });
        }
        if (input.isDefault) {
          await clearDefaultSender(
            tx,
            organizationId,
            ctx.locationId ?? null,
            now,
          );
        }
        const [row] = await tx
          .update(emailSenderAddress)
          .set({
            emailDomainId: domain.id,
            email: input.email,
            displayName: input.displayName,
            replyTo: input.replyTo,
            isDefault: input.isDefault,
            isDisabled: input.isDisabled,
            updatedAt: now,
          })
          .where(eq(emailSenderAddress.id, current.id))
          .returning();
        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "The sender address could not be updated.",
          });
        }
        if (row.isDefault) {
          await syncDomainDefault(tx, row, now);
        } else if (current.isDefault) {
          await clearLegacyDomainDefault(tx, current.emailDomainId, now);
        }
        return row;
      });
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "email.sender_address.updated",
        resourceType: "EMAIL_SENDER_ADDRESS",
        resourceId: updated.id,
        safeMetadata: {
          isDefault: updated.isDefault,
          isDisabled: updated.isDisabled,
        },
      });
      return updated;
    }),

  removeSenderAddress: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx);
      const current = await requireOwnedAddress(
        organizationId,
        ctx.locationId ?? null,
        input.id,
      );
      const now = new Date();
      await db.transaction(async (tx) => {
        await tx
          .update(emailSenderAddress)
          .set({
            isDefault: false,
            isDisabled: true,
            removedAt: now,
            updatedAt: now,
          })
          .where(eq(emailSenderAddress.id, current.id));
        if (current.isDefault) {
          await clearLegacyDomainDefault(tx, current.emailDomainId, now);
        }
      });
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "email.sender_address.removed",
        resourceType: "EMAIL_SENDER_ADDRESS",
        resourceId: current.id,
      });
      return { id: current.id };
    }),

  getDesign: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = await authorize(ctx);
    return getEmailDesignState({
      organizationId,
      locationId: ctx.locationId ?? null,
    });
  }),

  updateDesign: protectedProcedure
    .input(emailDesignSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx);
      const now = new Date();
      const saved = await db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ id: emailDesignProfile.id })
          .from(emailDesignProfile)
          .where(
            designScopeWhere(organizationId, ctx.locationId ?? null),
          )
          .limit(1);
        const values = {
          ...input,
          updatedByUserId: ctx.auth.user.id,
          updatedAt: now,
        };
        const [row] = existing
          ? await tx
              .update(emailDesignProfile)
              .set(values)
              .where(eq(emailDesignProfile.id, existing.id))
              .returning()
          : await tx
              .insert(emailDesignProfile)
              .values({
                id: createId(),
                organizationId,
                locationId: ctx.locationId ?? null,
                ...values,
              })
              .returning();
        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Email design settings could not be saved.",
          });
        }
        return row;
      });
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "email.design.updated",
        resourceType: "EMAIL_DESIGN_PROFILE",
        resourceId: saved.id,
      });
      return getEmailDesignState({
        organizationId,
        locationId: ctx.locationId ?? null,
      });
    }),

  sendTest: protectedProcedure
    .input(emailTestSendSchema)
    .mutation(async ({ ctx, input }) => {
      const organizationId = await authorize(ctx);
      const sender = await requireOwnedAddress(
        organizationId,
        ctx.locationId ?? null,
        input.senderAddressId,
      );
      const domain = await requireOwnedDomain({
        organizationId,
        locationId: ctx.locationId ?? null,
        id: sender.emailDomainId,
      });
      if (
        sender.isDisabled ||
        domain.isDisabled ||
        domain.status !== "VERIFIED" ||
        domain.lifecycleState !== "ACTIVE"
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Use an active sender on a verified domain for test email.",
        });
      }
      const testId = createId();
      const destination = testDestination(input.scenario, input.recipient);
      const design = (await getEmailDesignState({
        organizationId,
        locationId: ctx.locationId ?? null,
      })).effective;
      const rendered = await renderCampaignEmail({
        content: {
          subject: "Aurea email delivery test",
          sections: [
            {
              id: "test-heading",
              type: "header",
              title: "Email delivery test",
              subtitle: "Your Aurea and Resend connection is ready.",
            },
            {
              id: "test-content",
              type: "text",
              content:
                "This message exercises your selected sender address, workspace email design, Resend API request, and delivery webhook path.",
            },
          ],
        },
        design,
        variables: {
          name: "Aurea test recipient",
          firstName: "Aurea",
          email: destination,
          unsubscribe_url: "",
        },
      });
      const delivery = await enqueueEmail({
        organizationId,
        locationId: ctx.locationId ?? null,
        clientId: null,
        sourceType: "EMAIL_TEST",
        sourceId: testId,
        idempotencyKey: `email-test:${testId}`,
        to: destination,
        subject: `[Test] ${design.companyName} email delivery`,
        html: rendered.html,
        text: rendered.text,
        purpose: "SYSTEM",
        emailDomainId: domain.id,
        fromName: sender.displayName,
        fromEmail: sender.email,
        replyTo: sender.replyTo,
      });
      await recordCommunicationAudit({
        organizationId,
        locationId: ctx.locationId ?? null,
        actorUserId: ctx.auth.user.id,
        action: "email.test.queued",
        resourceType: "OUTBOUND_DELIVERY",
        resourceId: delivery.id,
        safeMetadata: { scenario: input.scenario },
      });
      return {
        id: delivery.id,
        status: delivery.status,
        destination,
      };
    }),
});

async function authorize(ctx: EmailSettingsContext): Promise<string> {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before managing email settings.",
    });
  }
  await requireCapability({
    actor: {
      userId: ctx.auth.user.id,
      organizationId: ctx.orgId,
      locationId: ctx.locationId,
    },
    capability: "provider.manage",
  });
  return ctx.orgId;
}

async function authorizeMessaging(ctx: EmailSettingsContext): Promise<string> {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before choosing an email sender.",
    });
  }
  await requireCapability({
    actor: {
      userId: ctx.auth.user.id,
      organizationId: ctx.orgId,
      locationId: ctx.locationId,
    },
    capability: "messaging.send",
  });
  return ctx.orgId;
}

function senderScopeWhere(
  organizationId: string,
  locationId: string | null,
): SQL | undefined {
  return and(
    eq(emailSenderAddress.organizationId, organizationId),
    locationId
      ? eq(emailSenderAddress.locationId, locationId)
      : isNull(emailSenderAddress.locationId),
  );
}

function senderChoiceScopeWhere(
  organizationId: string,
  locationId: string | null,
): SQL | undefined {
  return and(
    eq(emailSenderAddress.organizationId, organizationId),
    locationId
      ? or(
          eq(emailSenderAddress.locationId, locationId),
          isNull(emailSenderAddress.locationId),
        )
      : isNull(emailSenderAddress.locationId),
  );
}

function designScopeWhere(
  organizationId: string,
  locationId: string | null,
): SQL | undefined {
  return and(
    eq(emailDesignProfile.organizationId, organizationId),
    locationId
      ? eq(emailDesignProfile.locationId, locationId)
      : isNull(emailDesignProfile.locationId),
  );
}

async function requireOwnedDomain(input: {
  organizationId: string;
  locationId: string | null;
  id: string;
}) {
  const row = await db.query.emailDomain.findFirst({
    where: and(
      eq(emailDomain.id, input.id),
      eq(emailDomain.organizationId, input.organizationId),
      input.locationId
        ? eq(emailDomain.locationId, input.locationId)
        : isNull(emailDomain.locationId),
      isNull(emailDomain.removedAt),
    ),
  });
  if (!row) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Email domain not found in this workspace.",
    });
  }
  return row;
}

async function requireOwnedAddress(
  organizationId: string,
  locationId: string | null,
  id: string,
) {
  const row = await db.query.emailSenderAddress.findFirst({
    where: and(
      eq(emailSenderAddress.id, id),
      senderScopeWhere(organizationId, locationId),
      isNull(emailSenderAddress.removedAt),
    ),
  });
  if (!row) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Sender address not found in this workspace.",
    });
  }
  return row;
}

function validateAddressDomain(address: string, domain: string): void {
  if (!address.endsWith(`@${domain.toLowerCase()}`)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The sender address must use the selected sender domain.",
    });
  }
}

type EmailSettingsTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function clearDefaultSender(
  tx: EmailSettingsTransaction,
  organizationId: string,
  locationId: string | null,
  now: Date,
) {
  await tx
    .update(emailSenderAddress)
    .set({ isDefault: false, updatedAt: now })
    .where(senderScopeWhere(organizationId, locationId));
  await tx
    .update(emailDomain)
    .set({
      defaultFromName: null,
      defaultFromEmail: null,
      defaultReplyTo: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(emailDomain.organizationId, organizationId),
        locationId
          ? eq(emailDomain.locationId, locationId)
          : isNull(emailDomain.locationId),
      ),
    );
}

async function syncDomainDefault(
  tx: EmailSettingsTransaction,
  sender: typeof emailSenderAddress.$inferSelect,
  now: Date,
) {
  await tx
    .update(emailDomain)
    .set({
      defaultFromName: sender.displayName,
      defaultFromEmail: sender.email,
      defaultReplyTo: sender.replyTo,
      updatedAt: now,
    })
    .where(
      and(
        eq(emailDomain.id, sender.emailDomainId),
        eq(emailDomain.organizationId, sender.organizationId),
      ),
    );
}

async function clearLegacyDomainDefault(
  tx: EmailSettingsTransaction,
  emailDomainId: string,
  now: Date,
) {
  await tx
    .update(emailDomain)
    .set({
      defaultFromName: null,
      defaultFromEmail: null,
      defaultReplyTo: null,
      updatedAt: now,
    })
    .where(eq(emailDomain.id, emailDomainId));
}

function testDestination(
  scenario: "DELIVERED" | "BOUNCED" | "COMPLAINED" | "SUPPRESSED" | "CUSTOM",
  recipient: string | null,
): string {
  if (scenario === "CUSTOM") return recipient ?? "";
  const mailboxByScenario = {
    DELIVERED: "delivered@resend.dev",
    BOUNCED: "bounced@resend.dev",
    COMPLAINED: "complained@resend.dev",
    SUPPRESSED: "suppressed@resend.dev",
  } as const;
  return mailboxByScenario[scenario];
}
