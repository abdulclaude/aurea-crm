import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { NodeType } from "@/db/enums";
import { db } from "@/db";
import { classCredit, client, membershipPlan, studioMembership } from "@/db/schema";
import { triggerWorkflowsForNodeType } from "@/lib/workflow-triggers";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

const membershipStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "CANCELLED",
  "EXPIRED",
  "PAUSED",
]);

function requireOrg(ctx: { orgId: string | null }) {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active organization",
    });
  }
  return ctx.orgId;
}

function locationClause(locationId: string | null) {
  return locationId
    ? eq(studioMembership.locationId, locationId)
    : isNull(studioMembership.locationId);
}

async function getMembershipForOrg(id: string, organizationId: string) {
  const membership = await db.query.studioMembership.findFirst({
    where: and(
      eq(studioMembership.id, id),
      eq(studioMembership.organizationId, organizationId)
    ),
    with: {
      client: {
        columns: { id: true, name: true, email: true, phone: true, tags: true },
      },
      membershipPlan: {
        columns: { id: true, name: true, type: true, classCredits: true },
      },
      classCredits: true,
    },
  });

  if (!membership) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Membership not found" });
  }

  return {
    ...membership,
    classCredit: membership.classCredits,
  };
}

export const subscriptionsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ status: membershipStatusSchema.optional() }).optional())
    .query(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      const memberships = await db.query.studioMembership.findMany({
        where: and(
          eq(studioMembership.organizationId, organizationId),
          locationClause(ctx.locationId),
          input?.status ? eq(studioMembership.status, input.status) : undefined
        ),
        orderBy: desc(studioMembership.createdAt),
        with: {
          client: {
            columns: { id: true, name: true, email: true, phone: true, tags: true },
          },
          membershipPlan: {
            columns: {
              id: true,
              name: true,
              type: true,
              billingInterval: true,
              classCredits: true,
            },
          },
          classCredits: true,
        },
      });

      return memberships.map((membership) => ({
        ...membership,
        classCredit: membership.classCredits,
      }));
    }),

  create: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        planId: z.string(),
        startDate: z.string().transform((value) => new Date(value)).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);

      const plan = await db.query.membershipPlan.findFirst({
        where: and(
          eq(membershipPlan.id, input.planId),
          eq(membershipPlan.organizationId, organizationId),
          eq(membershipPlan.isActive, true)
        ),
      });
      if (!plan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Membership plan not found",
        });
      }

      const existingClient = await db.query.client.findFirst({
        where: and(eq(client.id, input.clientId), eq(client.organizationId, organizationId)),
      });
      if (!existingClient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      const startDate = input.startDate ?? new Date();
      let endDate: Date | null = null;
      if (plan.durationDays) {
        endDate = new Date(startDate.getTime() + plan.durationDays * 86_400_000);
      } else if (plan.billingInterval !== "ONE_TIME") {
        const intervalDays: Record<string, number> = {
          WEEKLY: 7,
          MONTHLY: 30,
          QUARTERLY: 90,
          ANNUALLY: 365,
        };
        endDate = new Date(
          startDate.getTime() + (intervalDays[plan.billingInterval] ?? 30) * 86_400_000
        );
      }

      const membershipId = randomUUID();
      await db.transaction(async (tx) => {
        await tx.insert(studioMembership).values({
          id: membershipId,
          name: plan.name,
          clientId: input.clientId,
          planId: plan.id,
          status: "ACTIVE",
          startDate,
          endDate,
          price: plan.price,
          currency: plan.currency,
          autoRenew: plan.billingInterval !== "ONE_TIME",
          organizationId,
          locationId: ctx.locationId ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        if (plan.classCredits) {
          await tx.insert(classCredit).values({
            id: randomUUID(),
            membershipId,
            clientId: input.clientId,
            totalCredits: plan.classCredits,
            usedCredits: 0,
            expiresAt: endDate,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        await tx
          .update(client)
          .set({
            acquisitionStage: "ACTIVE",
            acquiredAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(client.id, input.clientId));
      });

      const membership = await getMembershipForOrg(membershipId, organizationId);

      await triggerWorkflowsForNodeType({
        nodeType: NodeType.MEMBERSHIP_CREATED_TRIGGER,
        organizationId,
        locationId: ctx.locationId ?? null,
        triggerData: {
          membershipId: membership.id,
          clientId: membership.clientId,
          planId: membership.planId,
          planName: membership.membershipPlan?.name ?? membership.name,
          client: membership.client,
          startDate: membership.startDate.toISOString(),
          endDate: membership.endDate?.toISOString() ?? null,
          status: membership.status,
        },
      }).catch((error: unknown) => {
        console.error("Failed to trigger membership workflows", error);
      });

      return membership;
    }),

  freeze: protectedProcedure
    .input(
      z.object({
        membershipId: z.string(),
        freezeUntil: z.string().transform((value) => new Date(value)).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      const membership = await getMembershipForOrg(input.membershipId, organizationId);
      if (membership.status !== "ACTIVE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only freeze active memberships",
        });
      }

      await db
        .update(studioMembership)
        .set({
          status: "PAUSED",
          frozenAt: new Date(),
          frozenUntil: input.freezeUntil ?? null,
          updatedAt: new Date(),
        })
        .where(eq(studioMembership.id, input.membershipId));

      return getMembershipForOrg(input.membershipId, organizationId);
    }),

  unfreeze: protectedProcedure
    .input(z.object({ membershipId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      const membership = await getMembershipForOrg(input.membershipId, organizationId);
      if (membership.status !== "PAUSED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Membership is not frozen",
        });
      }

      let newEndDate = membership.endDate;
      if (membership.frozenAt && membership.endDate) {
        const frozenDuration = Date.now() - membership.frozenAt.getTime();
        newEndDate = new Date(membership.endDate.getTime() + frozenDuration);
      }

      await db
        .update(studioMembership)
        .set({
          status: "ACTIVE",
          frozenAt: null,
          frozenUntil: null,
          endDate: newEndDate,
          updatedAt: new Date(),
        })
        .where(eq(studioMembership.id, input.membershipId));

      return getMembershipForOrg(input.membershipId, organizationId);
    }),

  cancel: protectedProcedure
    .input(
      z.object({
        membershipId: z.string(),
        reason: z.string().max(500).optional(),
        immediately: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      const membership = await getMembershipForOrg(input.membershipId, organizationId);
      if (membership.status === "CANCELLED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already cancelled" });
      }

      await db
        .update(studioMembership)
        .set({
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: input.reason,
          autoRenew: false,
          endDate: input.immediately ? new Date() : membership.endDate,
          updatedAt: new Date(),
        })
        .where(eq(studioMembership.id, input.membershipId));

      const cancelled = await getMembershipForOrg(input.membershipId, organizationId);

      await triggerWorkflowsForNodeType({
        nodeType: NodeType.MEMBERSHIP_CANCELLED_TRIGGER,
        organizationId,
        locationId: ctx.locationId ?? null,
        triggerData: {
          membershipId: cancelled.id,
          clientId: cancelled.clientId,
          planId: cancelled.planId,
          reason: cancelled.cancelReason,
          cancelledAt: cancelled.cancelledAt?.toISOString() ?? null,
          status: cancelled.status,
        },
      }).catch((error: unknown) => {
        console.error("Failed to trigger membership-cancelled workflows", error);
      });

      return cancelled;
    }),

  listForMember: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        status: membershipStatusSchema.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      const memberships = await db.query.studioMembership.findMany({
        where: and(
          eq(studioMembership.clientId, input.clientId),
          eq(studioMembership.organizationId, organizationId),
          input.status ? eq(studioMembership.status, input.status) : undefined
        ),
        with: {
          membershipPlan: true,
          classCredits: true,
        },
        orderBy: desc(studioMembership.createdAt),
      });

      return memberships.map((membership) => ({
        ...membership,
        classCredit: membership.classCredits,
      }));
    }),

  getCredits: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      const credits = await db.query.classCredit.findMany({
        where: eq(classCredit.clientId, input.clientId),
        with: {
          studioMembership: {
            columns: { id: true, status: true, organizationId: true },
            with: {
              membershipPlan: { columns: { id: true, name: true } },
            },
          },
        },
        orderBy: desc(classCredit.createdAt),
      });

      const scopedCredits = credits.filter(
        (credit) => credit.studioMembership?.organizationId === organizationId
      );
      const totalRemaining = scopedCredits.reduce(
        (sum, credit) => sum + (credit.totalCredits - credit.usedCredits),
        0
      );

      return { credits: scopedCredits, totalRemaining };
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = requireOrg(ctx);
    const scopedWhere = (status?: "ACTIVE" | "PAUSED" | "CANCELLED") =>
      and(
        eq(studioMembership.organizationId, organizationId),
        ctx.locationId ? eq(studioMembership.locationId, ctx.locationId) : undefined,
        status ? eq(studioMembership.status, status) : undefined
      );

    const [active, paused, cancelled, total] = await Promise.all([
      db.select({ total: count() }).from(studioMembership).where(scopedWhere("ACTIVE")),
      db.select({ total: count() }).from(studioMembership).where(scopedWhere("PAUSED")),
      db.select({ total: count() }).from(studioMembership).where(scopedWhere("CANCELLED")),
      db.select({ total: count() }).from(studioMembership).where(scopedWhere()),
    ]);

    return {
      active: active[0]?.total ?? 0,
      paused: paused[0]?.total ?? 0,
      cancelled: cancelled[0]?.total ?? 0,
      total: total[0]?.total ?? 0,
    };
  }),
});
