import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, isNull, sql, type SQL } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  campaign,
  communicationProvisioningOperation,
  emailDomain,
} from "@/db/schema";
import { requireCommunicationEntitlement } from "@/features/communications/server/profile-service";
import {
  requestCommunicationProvisioning,
} from "@/features/communications/server/provisioning";
import { ensurePlatformResendBinding } from "@/features/communications/server/resend-binding";
import { requireCapability } from "@/features/permissions/server/authorization";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { recordCommunicationAudit } from "@/features/communications/server/audit";

type EmailDomainContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

const domainNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(253)
  .regex(
    /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/,
    "Enter a valid registrable domain.",
  );

async function requireProviderManagement(
  ctx: EmailDomainContext,
): Promise<string> {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization before managing email domains.",
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

async function enqueueDomainOperation(input: {
  organizationId: string;
  locationId: string | null;
  emailDomainId: string;
  providerAccountId: string;
  userId: string;
  operationType: "CREATE" | "VERIFY" | "REFRESH" | "RELEASE";
  idempotencyKey: string;
  safeInput: Record<string, unknown>;
}) {
  const [operation] = await db
    .insert(communicationProvisioningOperation)
    .values({
      id: createId(),
      organizationId: input.organizationId,
      locationId: input.locationId,
      providerAccountId: input.providerAccountId,
      emailDomainId: input.emailDomainId,
      service: "RESEND_DOMAIN",
      operationType: input.operationType,
      idempotencyKey: input.idempotencyKey,
      safeInput: input.safeInput,
      requestedByUserId: input.userId,
      nextAttemptAt: new Date(),
    })
    .onConflictDoNothing({
      target: [
        communicationProvisioningOperation.organizationId,
        communicationProvisioningOperation.idempotencyKey,
      ],
    })
    .returning();
  await requestCommunicationProvisioning(input.organizationId);
  return operation ?? null;
}

export const emailDomainsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = await requireProviderManagement(ctx);
    return db.query.emailDomain.findMany({
      where: emailDomainScopeWhere(
        organizationId,
        ctx.locationId ?? null,
      ),
      orderBy: [desc(emailDomain.isDefault), desc(emailDomain.createdAt)],
    });
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const organizationId = await requireProviderManagement(ctx);
      const domain = await db.query.emailDomain.findFirst({
        where: emailDomainOwnerWhere(
          input.id,
          organizationId,
          ctx.locationId ?? null,
        ),
      });
      if (!domain) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Domain not found." });
      }
      return domain;
    }),

  create: protectedProcedure
    .input(
      z.object({
        domain: domainNameSchema,
        defaultFromName: z.string().trim().min(1).max(120).optional(),
        defaultFromEmail: z.string().email().optional(),
        defaultReplyTo: z.string().email().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireProviderManagement(ctx);
      await requireCommunicationEntitlement({
        organizationId,
        channel: "EMAIL",
      });
      if (
        input.defaultFromEmail &&
        !input.defaultFromEmail.toLowerCase().endsWith(`@${input.domain}`)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The default sender must use the domain being added.",
        });
      }
      const binding = await ensurePlatformResendBinding({
        organizationId,
        createdByUserId: ctx.auth.user.id,
      });
      const now = new Date();
      const domainId = createId();
      const operationId = createId();
      const result = await db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ id: emailDomain.id })
          .from(emailDomain)
          .where(sql`lower(${emailDomain.domain}) = ${input.domain}`)
          .limit(1);
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This domain is already registered.",
          });
        }
        const [created] = await tx
          .insert(emailDomain)
          .values({
            id: domainId,
            organizationId,
            locationId: ctx.locationId ?? null,
            providerAccountId: binding.id,
            domain: input.domain,
            ownershipMode: "PLATFORM_MANAGED",
            status: "PENDING",
            lifecycleState: "PROVISIONING",
            defaultFromName: input.defaultFromName,
            defaultFromEmail: input.defaultFromEmail,
            defaultReplyTo: input.defaultReplyTo,
            updatedAt: now,
          })
          .returning();
        await tx.insert(communicationProvisioningOperation).values({
          id: operationId,
          organizationId,
          locationId: ctx.locationId ?? null,
          providerAccountId: binding.id,
          emailDomainId: domainId,
          service: "RESEND_DOMAIN",
          operationType: "CREATE",
          idempotencyKey: `resend-domain:create:${input.domain}`,
          safeInput: { kind: "RESEND_DOMAIN_CREATE", domain: input.domain },
          requestedByUserId: ctx.auth.user.id,
          nextAttemptAt: now,
        });
        return created;
      });
      await requestCommunicationProvisioning(organizationId);
      await recordCommunicationAudit({ organizationId, locationId: ctx.locationId ?? null, actorUserId: ctx.auth.user.id, action: "resend.domain.create_requested", resourceType: "EMAIL_DOMAIN", resourceId: result?.id ?? null });
      return { domain: result, operationId };
    }),

  verify: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireProviderManagement(ctx);
      const domain = await requireOwnedDomain(ctx, organizationId, input.id);
      if (!domain.providerAccountId || !domain.resendDomainId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Wait for domain registration before requesting verification.",
        });
      }
      const operation = await enqueueDomainOperation({
        organizationId,
        locationId: ctx.locationId ?? null,
        emailDomainId: domain.id,
        providerAccountId: domain.providerAccountId,
        userId: ctx.auth.user.id,
        operationType: "VERIFY",
        idempotencyKey: `resend-domain:verify:${domain.id}`,
        safeInput: { kind: "RESEND_DOMAIN_VERIFY", emailDomainId: domain.id },
      });
      return { success: true, operationId: operation?.id ?? null };
    }),

  checkStatus: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireProviderManagement(ctx);
      const domain = await requireOwnedDomain(ctx, organizationId, input.id);
      if (!domain.providerAccountId || !domain.resendDomainId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Wait for domain registration before refreshing status.",
        });
      }
      const minuteBucket = Math.floor(Date.now() / 60_000);
      const operation = await enqueueDomainOperation({
        organizationId,
        locationId: ctx.locationId ?? null,
        emailDomainId: domain.id,
        providerAccountId: domain.providerAccountId,
        userId: ctx.auth.user.id,
        operationType: "REFRESH",
        idempotencyKey: `resend-domain:refresh:${domain.id}:${minuteBucket}`,
        safeInput: { kind: "RESEND_DOMAIN_REFRESH", emailDomainId: domain.id },
      });
      return { domain, operationId: operation?.id ?? null };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        defaultFromName: z.string().trim().min(1).max(120).optional(),
        defaultFromEmail: z.string().email().optional(),
        defaultReplyTo: z.string().email().optional().nullable(),
        isDefault: z.boolean().optional(),
        isDisabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireProviderManagement(ctx);
      const domain = await requireOwnedDomain(ctx, organizationId, input.id);
      if (
        input.defaultFromEmail &&
        !input.defaultFromEmail
          .toLowerCase()
          .endsWith(`@${domain.domain.toLowerCase()}`)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The default sender must use this email domain.",
        });
      }
      const updated = await db.transaction(async (tx) => {
        if (input.isDefault) {
          await tx
            .update(emailDomain)
            .set({ isDefault: false, updatedAt: new Date() })
            .where(emailDomainScopeWhere(organizationId, ctx.locationId ?? null));
        }
        const [updated] = await tx
          .update(emailDomain)
          .set({
            defaultFromName: input.defaultFromName,
            defaultFromEmail: input.defaultFromEmail,
            defaultReplyTo: input.defaultReplyTo,
            isDefault: input.isDefault,
            isDisabled: input.isDisabled,
            updatedAt: new Date(),
          })
          .where(
            emailDomainOwnerWhere(
              input.id,
              organizationId,
              ctx.locationId ?? null,
            ),
          )
          .returning();
        if (!updated) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update the email domain.",
          });
        }
        return updated;
      });
      await recordCommunicationAudit({ organizationId, locationId: ctx.locationId ?? null, actorUserId: ctx.auth.user.id, action: "resend.domain.updated", resourceType: "EMAIL_DOMAIN", resourceId: updated.id, safeMetadata: { isDefault: input.isDefault ?? null, isDisabled: input.isDisabled ?? null } });
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await requireProviderManagement(ctx);
      const domain = await requireOwnedDomain(ctx, organizationId, input.id);
      const [campaignCount] = await db
        .select({ value: count() })
        .from(campaign)
        .where(
          and(
            eq(campaign.organizationId, organizationId),
            eq(campaign.emailDomainId, domain.id),
          ),
        );
      if ((campaignCount?.value ?? 0) > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `This domain is used by ${campaignCount?.value ?? 0} campaign(s). Remove those references first.`,
        });
      }
      if (!domain.providerAccountId || !domain.resendDomainId) {
        await db
          .update(emailDomain)
          .set({
            isDisabled: true,
            lifecycleState: "RELEASED",
            removedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(emailDomain.id, domain.id));
        await recordCommunicationAudit({ organizationId, locationId: ctx.locationId ?? null, actorUserId: ctx.auth.user.id, action: "resend.domain.released", resourceType: "EMAIL_DOMAIN", resourceId: domain.id });
        return { success: true, operationId: null };
      }
      const operation = await enqueueDomainOperation({
        organizationId,
        locationId: ctx.locationId ?? null,
        emailDomainId: domain.id,
        providerAccountId: domain.providerAccountId,
        userId: ctx.auth.user.id,
        operationType: "RELEASE",
        idempotencyKey: `resend-domain:delete:${domain.id}`,
        safeInput: { kind: "RESEND_DOMAIN_DELETE", emailDomainId: domain.id },
      });
      await recordCommunicationAudit({ organizationId, locationId: ctx.locationId ?? null, actorUserId: ctx.auth.user.id, action: "resend.domain.release_requested", resourceType: "EMAIL_DOMAIN", resourceId: domain.id });
      return { success: true, operationId: operation?.id ?? null };
    }),
});

async function requireOwnedDomain(
  ctx: EmailDomainContext,
  organizationId: string,
  id: string,
) {
  const domain = await db.query.emailDomain.findFirst({
    where: emailDomainOwnerWhere(id, organizationId, ctx.locationId ?? null),
  });
  if (!domain) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Domain not found." });
  }
  return domain;
}

function emailDomainScopeWhere(
  organizationId: string,
  locationId: string | null,
): SQL | undefined {
  return and(
    eq(emailDomain.organizationId, organizationId),
    locationId
      ? eq(emailDomain.locationId, locationId)
      : isNull(emailDomain.locationId),
  );
}

function emailDomainOwnerWhere(
  id: string,
  organizationId: string,
  locationId: string | null,
): SQL | undefined {
  return and(
    eq(emailDomain.id, id),
    emailDomainScopeWhere(organizationId, locationId),
  );
}
