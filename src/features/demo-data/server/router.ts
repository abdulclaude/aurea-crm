import "server-only";

import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { demoDataRun } from "@/db/schema";
import {
  DEMO_DATA_PROFILE_CONFIG,
  demoDataPreviewInputSchema,
  populateDemoDataInputSchema,
  recoverDemoDataInputSchema,
} from "@/features/demo-data/contracts";
import {
  getDemoDataAvailability,
  getDemoDataPreview,
  markDemoDataRunFailed,
  prepareDemoDataRun,
  recoverInterruptedDemoDataRun,
  requireDemoDataScope,
} from "@/features/demo-data/server/access";
import { seedCatalogPack } from "@/features/demo-data/server/packs/catalog-pack";
import { seedCustomerPack } from "@/features/demo-data/server/packs/customer-pack";
import { seedCoreOperationsPack } from "@/features/demo-data/server/packs/core-operations-pack";
import { seedFinancePack } from "@/features/demo-data/server/packs/finance-pack";
import { seedGrowthPack } from "@/features/demo-data/server/packs/growth-pack";
import { seedSchedulePack } from "@/features/demo-data/server/packs/schedule-pack";
import { seedStudioExtrasPack } from "@/features/demo-data/server/packs/studio-extras-pack";
import { assertDemoRunPostconditions } from "@/features/demo-data/server/postconditions";
import {
  insertDemoRecordRegistry,
  mergePackResults,
  type DemoSeedContext,
} from "@/features/demo-data/server/types";
import { deleteRedisCacheMatching } from "@/lib/redis/read-through-cache";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

function actor(ctx: {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId: string | null;
}): {
  userId: string;
  organizationId: string | null;
  locationId: string | null;
} {
  return {
    userId: ctx.auth.user.id,
    organizationId: ctx.orgId,
    locationId: ctx.locationId,
  };
}

function referenceDate(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12),
  );
}

export const seedRouter = createTRPCRouter({
  availability: protectedProcedure.query(async ({ ctx }) =>
    getDemoDataAvailability(actor(ctx)),
  ),

  preview: protectedProcedure
    .input(demoDataPreviewInputSchema)
    .query(async ({ ctx, input }) => {
      const scope = await requireDemoDataScope(actor(ctx));
      return getDemoDataPreview({ scope, profile: input.profile });
    }),

  listRuns: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).default(10) }))
    .query(async ({ ctx, input }) => {
      const scope = await requireDemoDataScope(actor(ctx));
      return db.query.demoDataRun.findMany({
        where: and(
          eq(demoDataRun.organizationId, scope.organizationId),
          eq(demoDataRun.locationId, scope.locationId),
        ),
        orderBy: [desc(demoDataRun.createdAt)],
        limit: input.limit,
        columns: {
          id: true,
          profile: true,
          status: true,
          schemaVersion: true,
          counts: true,
          referenceDate: true,
          startedAt: true,
          completedAt: true,
          failedAt: true,
          clearedAt: true,
          errorMessage: true,
        },
      });
    }),

  recoverInterruptedRun: protectedProcedure
    .input(recoverDemoDataInputSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireDemoDataScope(actor(ctx));
      return recoverInterruptedDemoDataRun({
        runId: input.runId,
        scope,
        confirmation: input.confirmation,
      });
    }),

  populateStudioData: protectedProcedure
    .input(populateDemoDataInputSchema)
    .mutation(async ({ ctx, input }) => {
      const scope = await requireDemoDataScope(actor(ctx));
      const anchor = referenceDate();
      const prepared = await prepareDemoDataRun({
        scope,
        profile: input.profile,
        confirmation: input.confirmation,
        idempotencyKey: input.idempotencyKey,
        allowExistingData: input.allowExistingData,
        referenceDate: anchor,
      });
      if (prepared.kind === "replay") {
        return {
          success: true as const,
          replayed: true as const,
          runId: prepared.runId,
          counts: prepared.counts,
        };
      }

      const seedContext: DemoSeedContext = {
        organizationId: scope.organizationId,
        locationId: scope.locationId,
        actorUserId: scope.userId,
        currency: scope.currency,
        timezone: scope.timezone,
        referenceDate: anchor,
        runId: prepared.runId,
        profile: input.profile,
        profileConfig: DEMO_DATA_PROFILE_CONFIG[input.profile],
      };

      try {
        const counts = await db.transaction(async (tx) => {
          await tx.execute(
            sql`select pg_advisory_xact_lock(hashtextextended(${`${scope.organizationId}:${scope.locationId}`}, 0))`,
          );
          const catalog = await seedCatalogPack(tx, seedContext);
          const customers = await seedCustomerPack(tx, seedContext, catalog);
          const schedule = await seedSchedulePack(tx, seedContext, {
            catalog,
            clients: customers.clients,
          });
          const operations = await seedCoreOperationsPack(tx, seedContext, {
            clients: customers.clients,
            instructors: catalog.instructors,
          });
          const finance = await seedFinancePack(tx, seedContext, {
            clients: customers.clients,
            instructors: catalog.instructors,
            classes: schedule.classes,
            bookings: schedule.bookings,
            memberships: customers.memberships,
            products: catalog.products,
            pricingOptions: catalog.pricingOptions,
          });
          const growth = await seedGrowthPack(tx, seedContext, {
            clients: customers.clients,
          });
          const studioExtras = await seedStudioExtrasPack(tx, seedContext, {
            clients: customers.clients,
            catalog: {
              classTypes: catalog.classTypes,
              instructors: catalog.instructors,
              plans: catalog.plans,
              pricingOptions: catalog.pricingOptions,
              rooms: catalog.rooms,
              services: catalog.services,
            },
          });
          const combined = mergePackResults([
            catalog,
            customers,
            schedule,
            operations,
            finance,
            growth,
            studioExtras,
          ]);
          await assertDemoRunPostconditions(
            tx,
            seedContext,
            combined.records,
          );
          await insertDemoRecordRegistry(tx, prepared.runId, combined.records);

          const completedAt = new Date();
          const [completedRun] = await tx
            .update(demoDataRun)
            .set({
              status: "COMPLETED",
              counts: combined.counts,
              completedAt,
              failedAt: null,
              errorMessage: null,
              updatedAt: completedAt,
            })
            .where(
              and(
                eq(demoDataRun.id, prepared.runId),
                eq(demoDataRun.organizationId, scope.organizationId),
                eq(demoDataRun.locationId, scope.locationId),
                eq(demoDataRun.status, "RUNNING"),
              ),
            )
            .returning({ id: demoDataRun.id });
          if (!completedRun) {
            throw new Error(
              "The demo data run was no longer active when population completed.",
            );
          }
          return combined.counts;
        });

        await deleteRedisCacheMatching([
          `studio-dashboard:v1:*:${scope.organizationId}:${scope.locationId}*`,
          `revenue:v1:overview:${scope.organizationId}:${scope.locationId}:*`,
        ]);
        return {
          success: true as const,
          replayed: false as const,
          runId: prepared.runId,
          counts,
        };
      } catch (error) {
        await markDemoDataRunFailed({
          runId: prepared.runId,
          scope,
          error,
        });
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Demo data population failed and no partial fixture data was kept.",
          cause: error,
        });
      }
    }),
});
