import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, count, desc, eq, isNull, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { client, studioMembership } from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { ClientType, LifecycleStage } from "@/db/enums";

const acquisitionStages = ["INQUIRY", "TRIAL", "ACTIVE", "LOST"] as const;
type AcquisitionStage = (typeof acquisitionStages)[number];

const stageOrder = acquisitionStages;

function clientTypeForStage(stage: AcquisitionStage): ClientType {
  if (stage === "ACTIVE") {
    return ClientType.CUSTOMER;
  }
  if (stage === "LOST") {
    return ClientType.CLOSED;
  }
  if (stage === "TRIAL") {
    return ClientType.PROSPECT;
  }
  return ClientType.LEAD;
}

function lifecycleForStage(stage: AcquisitionStage): LifecycleStage | null {
  if (stage === "ACTIVE") {
    return LifecycleStage.CUSTOMER;
  }
  if (stage === "TRIAL") {
    return LifecycleStage.OPPORTUNITY;
  }
  if (stage === "INQUIRY") {
    return LifecycleStage.LEAD;
  }
  return null;
}

function scopedClientConditions({
  organizationId,
  locationId,
}: {
  organizationId: string;
  locationId: string | null;
}): SQL[] {
  return [
    eq(client.organizationId, organizationId),
    locationId ? eq(client.locationId, locationId) : isNull(client.locationId),
  ];
}

export const acquisitionRouter = createTRPCRouter({
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Organization context is required",
      });
    }

    const [clients, memberships] = await Promise.all([
      db.query.client.findMany({
        where: and(...scopedClientConditions({
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
        })),
        orderBy: [desc(client.updatedAt), desc(client.createdAt)],
        limit: 200,
        columns: {
          id: true,
          name: true,
          email: true,
          phone: true,
          source: true,
          score: true,
          type: true,
          acquisitionStage: true,
          trialStartedAt: true,
          acquiredAt: true,
          createdAt: true,
          updatedAt: true,
        },
        with: {
          studioMemberships: {
            columns: { id: true, status: true, startDate: true },
            orderBy: desc(studioMembership.startDate),
            limit: 1,
            with: {
              membershipPlan: { columns: { name: true } },
            },
          },
        },
      }),
      db
        .select({ total: count() })
        .from(studioMembership)
        .where(
          and(
            eq(studioMembership.organizationId, ctx.orgId),
            ctx.locationId
              ? eq(studioMembership.locationId, ctx.locationId)
              : isNull(studioMembership.locationId),
            eq(studioMembership.status, "ACTIVE")
          )
        ),
    ]);
    const normalizedClients = clients.map(({ studioMemberships, ...item }) => ({
      ...item,
      studioMembership: studioMemberships,
    }));

    return {
      stages: stageOrder.map((stage) => ({
        stage,
        clients: normalizedClients.filter((item) => item.acquisitionStage === stage),
      })),
      totals: {
        inquiry: normalizedClients.filter((item) => item.acquisitionStage === "INQUIRY").length,
        trial: normalizedClients.filter((item) => item.acquisitionStage === "TRIAL").length,
        active: normalizedClients.filter((item) => item.acquisitionStage === "ACTIVE").length,
        lost: normalizedClients.filter((item) => item.acquisitionStage === "LOST").length,
        activeMemberships: memberships[0]?.total ?? 0,
      },
    };
  }),

  updateStage: protectedProcedure
    .input(z.object({ clientId: z.string(), stage: z.enum(acquisitionStages) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Organization context is required",
        });
      }

      const existing = await db.query.client.findFirst({
        where: and(
          eq(client.id, input.clientId),
          ...scopedClientConditions({
            organizationId: ctx.orgId,
            locationId: ctx.locationId ?? null,
          })
        ),
        columns: { id: true, acquisitionStage: true, trialStartedAt: true, acquiredAt: true },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      const now = new Date();
      const [updatedClient] = await db
        .update(client)
        .set({
          acquisitionStage: input.stage,
          type: clientTypeForStage(input.stage),
          lifecycleStage: lifecycleForStage(input.stage),
          trialStartedAt:
            input.stage === "TRIAL" && !existing.trialStartedAt
              ? now
              : existing.trialStartedAt,
          acquiredAt:
            input.stage === "ACTIVE" && !existing.acquiredAt
              ? now
              : existing.acquiredAt,
          updatedAt: now,
        })
        .where(eq(client.id, input.clientId))
        .returning({
          id: client.id,
          name: client.name,
          acquisitionStage: client.acquisitionStage,
          type: client.type,
          lifecycleStage: client.lifecycleStage,
          trialStartedAt: client.trialStartedAt,
          acquiredAt: client.acquiredAt,
        });

      return updatedClient;
    }),
});
