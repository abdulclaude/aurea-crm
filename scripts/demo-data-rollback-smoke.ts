import { and, count, eq } from "drizzle-orm";

import { db, dbPool } from "@/db";
import {
  cancellationPolicy,
  client,
  demoDataRun,
  location,
  locationMember,
  loyaltyProgram,
  member,
  organization,
  paymentRecoveryPolicy,
  referralProgram,
  studioBooking,
  studioBookingPayment,
  studioClass,
  studioPayment,
  user,
} from "@/db/schema";
import { DEMO_DATA_PROFILE_CONFIG } from "@/features/demo-data/contracts";
import type { DemoDataProfile } from "@/features/demo-data/contracts";
import { seedCatalogPack } from "@/features/demo-data/server/packs/catalog-pack";
import { seedCoreOperationsPack } from "@/features/demo-data/server/packs/core-operations-pack";
import { seedCustomerPack } from "@/features/demo-data/server/packs/customer-pack";
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

type SmokeSummary = {
  bookings: number;
  bookingPaymentLinks: number;
  classes: number;
  clients: number;
  ownedRecords: number;
  payments: number;
  profile: DemoDataProfile;
  recordTypes: number;
};

const rollbackSignal = new Error("demo-data-smoke-rollback");
const profile: DemoDataProfile =
  process.argv.includes("--qa-exhaustive") ||
  process.env.DEMO_SMOKE_PROFILE === "QA_EXHAUSTIVE"
    ? "QA_EXHAUSTIVE"
    : "SHOWCASE";
const suffix = crypto.randomUUID().slice(0, 8);
const organizationId = `demo-smoke-org-${suffix}`;
const locationId = `demo-smoke-location-${suffix}`;
const runId = crypto.randomUUID();
let summary: SmokeSummary | null = null;

async function main(): Promise<void> {
  try {
    const [actor] = await db.select({ id: user.id }).from(user).limit(1);
    if (!actor)
      throw new Error("Demo smoke test requires one existing local user.");

    try {
      await db.transaction(async (tx) => {
        const now = new Date();
        await tx.insert(organization).values({
          id: organizationId,
          name: "Aurea Demo Rollback Smoke",
          slug: `aurea-demo-smoke-${suffix}`,
          currency: "GBP",
          studioType: "MULTI_DISCIPLINE",
          createdAt: now,
        });
        await tx.insert(location).values({
          id: locationId,
          organizationId,
          companyName: "Aurea Demo Rollback Smoke",
          timezone: "Europe/London",
          createdByUserId: actor.id,
          createdAt: now,
          updatedAt: now,
        });
        await tx.insert(member).values({
          id: crypto.randomUUID(),
          organizationId,
          userId: actor.id,
          role: "owner",
          createdAt: now,
        });
        await tx.insert(locationMember).values({
          id: crypto.randomUUID(),
          locationId,
          userId: actor.id,
          role: "AGENCY",
          createdAt: now,
          updatedAt: now,
        });
        await tx.insert(client).values({
          id: `existing-client-${suffix}`,
          organizationId,
          locationId,
          name: "Existing local member",
          email: `existing.${suffix}@example.invalid`,
          updatedAt: now,
        });
        await tx.insert(loyaltyProgram).values({
          id: `existing-loyalty-${suffix}`,
          organizationId,
          name: "Existing rewards",
          currency: "GBP",
          updatedAt: now,
        });
        await tx.insert(referralProgram).values({
          id: `existing-referral-${suffix}`,
          organizationId,
          locationId,
          name: "Existing referrals",
          referrerRewardValue: "10.00",
          refereeRewardValue: "10.00",
          currency: "GBP",
          updatedAt: now,
        });
        await tx.insert(cancellationPolicy).values({
          id: `existing-cancellation-${suffix}`,
          organizationId,
          locationId,
          name: "Existing default policy",
          noShowFeeAmount: "10.00",
          lateCancelFee: "5.00",
          currency: "GBP",
          chargeCard: false,
          sendNotification: false,
          isDefault: true,
          isActive: true,
          updatedAt: now,
        });
        await tx.insert(paymentRecoveryPolicy).values({
          id: `existing-recovery-${suffix}`,
          organizationId,
          locationId,
          target: "INVOICE",
          mode: "ENABLED",
          name: "Existing invoice recovery",
          version: 1,
          gracePeriodDays: 3,
          scheduleDays: [0, 3, 7],
          maxActions: 3,
          steps: [{ type: "CREATE_TASK" }],
          isActive: true,
          createdBy: actor.id,
          updatedAt: now,
        });
        await tx.insert(demoDataRun).values({
          id: runId,
          organizationId,
          locationId,
          profile,
          status: "RUNNING",
          schemaVersion: 1,
          idempotencyKey: `smoke-${suffix}`,
          requestedByUserId: actor.id,
          referenceDate: new Date("2026-07-14T12:00:00.000Z"),
          startedAt: now,
          createdAt: now,
          updatedAt: now,
        });

        const context: DemoSeedContext = {
          organizationId,
          locationId,
          actorUserId: actor.id,
          currency: "GBP",
          timezone: "Europe/London",
          referenceDate: new Date("2026-07-14T12:00:00.000Z"),
          runId,
          profile,
          profileConfig: DEMO_DATA_PROFILE_CONFIG[profile],
        };
        const catalog = await seedCatalogPack(tx, context);
        const customers = await seedCustomerPack(tx, context, catalog);
        const schedule = await seedSchedulePack(tx, context, {
          catalog,
          clients: customers.clients,
        });
        const operations = await seedCoreOperationsPack(tx, context, {
          clients: customers.clients,
          instructors: catalog.instructors,
        });
        const finance = await seedFinancePack(tx, context, {
          clients: customers.clients,
          instructors: catalog.instructors,
          classes: schedule.classes,
          bookings: schedule.bookings,
          memberships: customers.memberships,
          products: catalog.products,
          pricingOptions: catalog.pricingOptions,
        });
        const growth = await seedGrowthPack(tx, context, {
          clients: customers.clients,
        });
        const extras = await seedStudioExtrasPack(tx, context, {
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
          extras,
        ]);
        await assertDemoRunPostconditions(tx, context, combined.records);
        await insertDemoRecordRegistry(tx, runId, combined.records);

        const [classRows] = await tx
          .select({ value: count() })
          .from(studioClass)
          .where(
            and(
              eq(studioClass.organizationId, organizationId),
              eq(studioClass.locationId, locationId),
            ),
          );
        const [clientRows] = await tx
          .select({ value: count() })
          .from(client)
          .where(
            and(
              eq(client.organizationId, organizationId),
              eq(client.locationId, locationId),
            ),
          );
        const [bookingRows] = await tx
          .select({ value: count() })
          .from(studioBooking)
          .innerJoin(studioClass, eq(studioClass.id, studioBooking.classId))
          .where(
            and(
              eq(studioClass.organizationId, organizationId),
              eq(studioClass.locationId, locationId),
            ),
          );
        const [paymentRows] = await tx
          .select({ value: count() })
          .from(studioPayment)
          .where(
            and(
              eq(studioPayment.organizationId, organizationId),
              eq(studioPayment.locationId, locationId),
            ),
          );
        const [bookingPaymentRows] = await tx
          .select({ value: count() })
          .from(studioBookingPayment)
          .where(
            and(
              eq(studioBookingPayment.organizationId, organizationId),
              eq(studioBookingPayment.locationId, locationId),
            ),
          );
        const uniqueRecords = new Set(
          combined.records.map(
            (record) => `${record.recordType}:${record.recordId}`,
          ),
        );
        summary = {
          bookings: bookingRows?.value ?? 0,
          bookingPaymentLinks: bookingPaymentRows?.value ?? 0,
          classes: classRows?.value ?? 0,
          clients: clientRows?.value ?? 0,
          ownedRecords: uniqueRecords.size,
          payments: paymentRows?.value ?? 0,
          profile,
          recordTypes: new Set(
            combined.records.map((record) => record.recordType),
          ).size,
        };
        throw rollbackSignal;
      });
    } catch (error) {
      if (error !== rollbackSignal) throw error;
    }

    const [persisted] = await db
      .select({ value: count() })
      .from(organization)
      .where(eq(organization.id, organizationId));
    if ((persisted?.value ?? 0) !== 0) {
      throw new Error("Demo smoke transaction did not roll back.");
    }
    if (!summary)
      throw new Error("Demo smoke transaction produced no summary.");
    process.stdout.write(
      `${JSON.stringify({ rolledBack: true, ...summary }, null, 2)}\n`,
    );
  } finally {
    await dbPool.end();
  }
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  const cause =
    error instanceof Error && error.cause instanceof Error
      ? `\nCaused by: ${error.cause.stack ?? error.cause.message}`
      : "";
  process.stderr.write(`${message}${cause}\n`);
  process.exitCode = 1;
});
