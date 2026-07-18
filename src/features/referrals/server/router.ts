import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { randomBytes } from "crypto";
import { createId } from "@paralleldrive/cuid2";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { client, referral, referralProgram } from "@/db/schema";
import { requireCapability } from "@/features/permissions/server/authorization";
import { buildReferralConversionAutomationDispatch } from "@/features/referrals/lib/referral-conversion-automation";
import { triggerWorkflowsForNodeType } from "@/lib/workflow-triggers";

type ReferralProcedureContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
};

const authorize = async (
  ctx: ReferralProcedureContext,
  capability: "customer.view" | "customer.manage" | "settings.manage",
) => {
  await requireCapability({
    actor: {
      userId: ctx.auth.user.id,
      organizationId: ctx.orgId,
      locationId: ctx.locationId,
    },
    capability,
  });
};

const referralProgramScope = (
  organizationId: string,
  locationId: string | null,
) =>
  and(
    eq(referralProgram.organizationId, organizationId),
    locationId
      ? eq(referralProgram.locationId, locationId)
      : isNull(referralProgram.locationId),
  );

const referralScope = (organizationId: string, locationId: string | null) =>
  and(
    eq(referral.organizationId, organizationId),
    locationId
      ? eq(referral.locationId, locationId)
      : isNull(referral.locationId),
  );

const countReferrals = async (input: {
  programId: string;
  organizationId: string;
  locationId: string | null;
  status?: string;
}): Promise<number> => {
  const [row] = await db
    .select({ total: count() })
    .from(referral)
    .innerJoin(
      client,
      and(
        eq(client.id, referral.referrerClientId),
        eq(client.organizationId, input.organizationId),
        input.locationId
          ? eq(client.locationId, input.locationId)
          : isNull(client.locationId),
      ),
    )
    .where(
      and(
        referralScope(input.organizationId, input.locationId),
        eq(referral.programId, input.programId),
        ...(input.status ? [eq(referral.status, input.status as (typeof referral.status.enumValues)[number])] : [])
      )
    );

  return row?.total ?? 0;
};

export const referralsRouter = createTRPCRouter({
  getProgram: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
    await authorize(ctx, "customer.view");

    const program = await db.query.referralProgram.findFirst({
      where: referralProgramScope(ctx.orgId, ctx.locationId),
    });

    if (!program) return null;

    return {
      ...program,
      _count: {
        referrals: await countReferrals({
          programId: program.id,
          organizationId: ctx.orgId,
          locationId: ctx.locationId,
        }),
      },
    };
  }),

  setupProgram: protectedProcedure
    .input(z.object({
      name: z.string().min(1).default("Refer a Friend"),
      referrerRewardType: z.enum(["CREDIT", "DISCOUNT", "FREE_CLASS", "CASH"]).default("CREDIT"),
      referrerRewardValue: z.number().min(0),
      refereeRewardType: z.enum(["CREDIT", "DISCOUNT", "FREE_CLASS", "CASH"]).default("DISCOUNT"),
      refereeRewardValue: z.number().min(0),
      refereeOfferDays: z.number().int().min(1).max(90).default(30),
      currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("GBP"),
      maxReferralsPerMember: z.number().int().min(1).nullable().default(null),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      await authorize(ctx, "settings.manage");

      const now = new Date();
      const values = {
        organizationId: ctx.orgId,
        locationId: ctx.locationId,
        name: input.name,
        referrerRewardType: input.referrerRewardType,
        referrerRewardValue: input.referrerRewardValue.toString(),
        refereeRewardType: input.refereeRewardType,
        refereeRewardValue: input.refereeRewardValue.toString(),
        refereeOfferDays: input.refereeOfferDays,
        currency: input.currency,
        maxReferralsPerMember: input.maxReferralsPerMember,
        updatedAt: now,
      };

      const [program] = await db
        .insert(referralProgram)
        .values({
          id: createId(),
          ...values,
          createdAt: now,
        })
        .onConflictDoUpdate({
          target: [
            referralProgram.organizationId,
            referralProgram.locationId,
          ],
          set: values,
        })
        .returning();

      return program;
    }),

  toggleProgram: protectedProcedure
    .input(z.object({ isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      await authorize(ctx, "settings.manage");

      const [program] = await db
        .update(referralProgram)
        .set({ isActive: input.isActive, updatedAt: new Date() })
        .where(referralProgramScope(ctx.orgId, ctx.locationId))
        .returning();

      if (!program) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Referral program not found" });
      }

      return program;
    }),

  createReferral: protectedProcedure
    .input(z.object({
      referrerClientId: z.string(),
      refereeEmail: z.string().email(),
      refereePhone: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      await authorize(ctx, "customer.manage");
      const organizationId = ctx.orgId;

      return db.transaction(async (tx) => {
        const [program] = await tx
          .select()
          .from(referralProgram)
          .where(referralProgramScope(organizationId, ctx.locationId))
          .limit(1)
          .for("update");

        if (!program?.isActive) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Referral program not active",
          });
        }

        const [referrer] = await tx
          .select({ id: client.id })
          .from(client)
          .where(
            and(
              eq(client.id, input.referrerClientId),
              eq(client.organizationId, organizationId),
              ctx.locationId
                ? eq(client.locationId, ctx.locationId)
                : isNull(client.locationId),
            ),
          )
          .limit(1);
        if (!referrer) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Referrer not found" });
        }

        if (program.maxReferralsPerMember) {
          const [row] = await tx
            .select({ total: count() })
            .from(referral)
            .where(
              and(
                referralScope(organizationId, ctx.locationId),
                eq(referral.programId, program.id),
                eq(referral.referrerClientId, input.referrerClientId),
              ),
            );
          if ((row?.total ?? 0) >= program.maxReferralsPerMember) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "Referral limit reached",
            });
          }
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + program.refereeOfferDays);
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const [createdReferral] = await tx
            .insert(referral)
            .values({
              id: createId(),
              organizationId,
              locationId: ctx.locationId,
              programId: program.id,
              referrerClientId: input.referrerClientId,
              refereeEmail: input.refereeEmail,
              refereePhone: input.refereePhone,
              code: randomBytes(4).toString("hex").toUpperCase(),
              expiresAt,
            })
            .onConflictDoNothing({ target: referral.code })
            .returning();
          if (createdReferral) return createdReferral;
        }

        throw new TRPCError({
          code: "CONFLICT",
          message: "Could not allocate a unique referral code",
        });
      });
    }),

  validateCode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      await authorize(ctx, "customer.view");
      const [existingReferral] = await db
        .select({
          code: referral.code,
          status: referral.status,
          expiresAt: referral.expiresAt,
          refereeRewardType: referralProgram.refereeRewardType,
          refereeRewardValue: referralProgram.refereeRewardValue,
          currency: referralProgram.currency,
          programActive: referralProgram.isActive,
        })
        .from(referral)
        .innerJoin(
          referralProgram,
          and(
            eq(referralProgram.id, referral.programId),
            referralProgramScope(ctx.orgId, ctx.locationId),
          ),
        )
        .where(
          and(
            eq(referral.code, input.code),
            referralScope(ctx.orgId, ctx.locationId),
          ),
        )
        .limit(1);

      if (!existingReferral || existingReferral.status !== "PENDING" || existingReferral.expiresAt < new Date()) {
        return { valid: false, referral: null };
      }

      if (!existingReferral.programActive) return { valid: false, referral: null };

      return {
        valid: true,
        referral: {
          code: existingReferral.code,
          reward: {
            refereeRewardType: existingReferral.refereeRewardType,
            refereeRewardValue: existingReferral.refereeRewardValue,
            currency: existingReferral.currency,
            isActive: existingReferral.programActive,
          },
        },
      };
    }),

  convertReferral: protectedProcedure
    .input(z.object({ code: z.string(), refereeClientId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      await authorize(ctx, "customer.manage");
      const organizationId = ctx.orgId;
      const convertedAt = new Date();
      const convertedReferral = await db.transaction(async (tx) => {
        const [existingReferral] = await tx
          .select({
            id: referral.id,
            status: referral.status,
            expiresAt: referral.expiresAt,
            refereeEmail: referral.refereeEmail,
          })
          .from(referral)
          .innerJoin(
            referralProgram,
            and(
              eq(referralProgram.id, referral.programId),
              referralProgramScope(organizationId, ctx.locationId),
              eq(referralProgram.isActive, true),
            ),
          )
          .where(
            and(
              eq(referral.code, input.code),
              referralScope(organizationId, ctx.locationId),
            ),
          )
          .limit(1)
          .for("update");
        if (
          !existingReferral ||
          existingReferral.status !== "PENDING" ||
          existingReferral.expiresAt <= new Date()
        ) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invalid referral" });
        }
        const [referee] = await tx
          .select({ id: client.id, email: client.email })
          .from(client)
          .where(
            and(
              eq(client.id, input.refereeClientId),
              eq(client.organizationId, organizationId),
              ctx.locationId
                ? eq(client.locationId, ctx.locationId)
                : isNull(client.locationId),
            ),
          )
          .limit(1);
        if (
          !referee?.email ||
          referee.email.trim().toLowerCase() !==
            existingReferral.refereeEmail.trim().toLowerCase()
        ) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Invalid referral" });
        }
        const [updatedReferral] = await tx
          .update(referral)
          .set({
            status: "CONVERTED",
            refereeClientId: referee.id,
            convertedAt,
          })
          .where(
            and(
              eq(referral.id, existingReferral.id),
              referralScope(organizationId, ctx.locationId),
              eq(referral.status, "PENDING"),
            ),
          )
          .returning();
        if (!updatedReferral) {
          throw new TRPCError({ code: "CONFLICT", message: "Referral already changed" });
        }
        return updatedReferral;
      });

      const dispatch = buildReferralConversionAutomationDispatch({
        referralId: convertedReferral.id,
        programId: convertedReferral.programId,
        organizationId: convertedReferral.organizationId,
        locationId: convertedReferral.locationId,
        referrerClientId: convertedReferral.referrerClientId,
        refereeClientId: input.refereeClientId,
        convertedAt,
      });
      await triggerWorkflowsForNodeType(dispatch).catch((error: unknown) => {
        console.error("Failed to trigger referral conversion workflows", error);
      });

      return convertedReferral;
    }),

  listReferrals: protectedProcedure
    .input(z.object({
      status: z.enum(["PENDING", "SIGNED_UP", "CONVERTED", "REWARDED", "EXPIRED"]).optional(),
      referrerClientId: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      await authorize(ctx, "customer.view");

      const program = await db.query.referralProgram.findFirst({
        where: referralProgramScope(ctx.orgId, ctx.locationId),
      });

      if (!program) return [];
      const referrerClient = alias(client, "referral_referrer_client");
      const refereeClient = alias(client, "referral_referee_client");
      const rows = await db
        .select({
          referral,
          referrerId: referrerClient.id,
          referrerName: referrerClient.name,
          referrerEmail: referrerClient.email,
          refereeId: refereeClient.id,
          refereeName: refereeClient.name,
        })
        .from(referral)
        .innerJoin(
          referrerClient,
          and(
            eq(referrerClient.id, referral.referrerClientId),
            eq(referrerClient.organizationId, ctx.orgId),
            ctx.locationId
              ? eq(referrerClient.locationId, ctx.locationId)
              : isNull(referrerClient.locationId),
          ),
        )
        .leftJoin(
          refereeClient,
          and(
            eq(refereeClient.id, referral.refereeClientId),
            eq(refereeClient.organizationId, ctx.orgId),
            ctx.locationId
              ? eq(refereeClient.locationId, ctx.locationId)
              : isNull(refereeClient.locationId),
          ),
        )
        .where(
          and(
            referralScope(ctx.orgId, ctx.locationId),
            eq(referral.programId, program.id),
            input.status ? eq(referral.status, input.status) : undefined,
            input.referrerClientId
              ? eq(referral.referrerClientId, input.referrerClientId)
              : undefined,
          ),
        )
        .orderBy(desc(referral.createdAt))
        .limit(input.limit);

      return rows.map((row) => ({
        ...row.referral,
        referrerClient: {
          id: row.referrerId,
          name: row.referrerName,
          email: row.referrerEmail,
        },
        refereeClient: row.refereeId
          ? { id: row.refereeId, name: row.refereeName }
          : null,
      }));
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
    await authorize(ctx, "customer.view");

    const program = await db.query.referralProgram.findFirst({
      where: referralProgramScope(ctx.orgId, ctx.locationId),
    });
    if (!program) return null;

    const base = {
      programId: program.id,
      organizationId: ctx.orgId,
      locationId: ctx.locationId,
    };
    const [total, converted, pending] = await Promise.all([
      countReferrals(base),
      countReferrals({ ...base, status: "CONVERTED" }),
      countReferrals({ ...base, status: "PENDING" }),
    ]);

    return {
      totalReferrals: total,
      converted,
      pending,
      conversionRate: total > 0 ? Math.round((converted / total) * 1000) / 10 : 0,
    };
  }),
});
