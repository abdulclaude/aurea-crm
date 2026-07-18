import { TRPCError } from "@trpc/server";
import { and, count, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  classType,
  instructor,
  location,
  organization,
  pricingOption,
  publicationTarget,
  publicationVersion,
  room,
  stripeConnection,
  widgetConfig,
} from "@/db/schema";
import { connectAccountStatus } from "@/features/commerce/lib/stripe-connect-event-contract";
import { getPublicationFrameOrigins } from "@/features/publications/lib/frame-origin-policy";
import { getPublicationParity } from "@/features/publications/server/version-service";
import {
  buildLaunchpadReadiness,
  hasPaidPublicSale,
  isValidLocalPricing,
} from "@/features/studio/lib/launchpad-readiness";
import { getPublicScheduleInventory } from "@/features/studio/server/public-schedule-inventory";
import { getWidgetPublicationHealth } from "@/features/studio/server/widget-publication-health";
import {
  targetScopeWhere,
  widgetScopeWhere,
  type WidgetScope,
} from "@/features/studio/server/widget-router-support";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

function requireOrgId(orgId: string | null): string {
  if (!orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active organization",
    });
  }
  return orgId;
}

function exactLocation(column: AnyPgColumn, locationId: string | null) {
  return locationId ? eq(column, locationId) : isNull(column);
}

async function hasCurrentPublishedBookingSurface(
  scope: WidgetScope,
): Promise<boolean> {
  const targets = await db
    .select({
      id: publicationTarget.id,
      kind: publicationTarget.kind,
      sourceId: publicationTarget.sourceId,
      slug: publicationTarget.slug,
      snapshot: publicationVersion.snapshot,
    })
    .from(publicationTarget)
    .innerJoin(
      publicationVersion,
      and(
        eq(publicationVersion.id, publicationTarget.publishedVersionId),
        eq(publicationVersion.targetId, publicationTarget.id),
      ),
    )
    .where(
      and(
        targetScopeWhere(scope),
        inArray(publicationTarget.kind, ["SCHEDULE", "WIDGET"]),
        eq(publicationTarget.status, "PUBLISHED"),
      ),
    );

  const scheduleHealth = await Promise.all(
    targets
      .filter((target) => target.kind === "SCHEDULE")
      .map(async (target) => {
        try {
          const parity = await getPublicationParity({ ...scope, id: target.id });
          return parity.matchesPublished && parity.publishable;
        } catch {
          return false;
        }
      }),
  );
  if (scheduleHealth.some(Boolean)) return true;

  const widgetTargets = targets.filter(
    (target) =>
      target.kind === "WIDGET" &&
      getPublicationFrameOrigins(target).length > 0,
  );
  if (widgetTargets.length === 0) return false;
  const widgets = await db
    .select()
    .from(widgetConfig)
    .where(widgetScopeWhere(scope));
  const health = await getWidgetPublicationHealth({
    widgets,
    targets: widgetTargets,
    scope,
  });
  return widgetTargets.some(
    (target) =>
      target.sourceId !== null && health.get(target.sourceId) === true,
  );
}

export const launchpadRouter = createTRPCRouter({
  progress: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = requireOrgId(ctx.orgId);
    const locationId = ctx.locationId ?? null;
    const scope = { organizationId, locationId };

    const [
      workspaceRows,
      rooms,
      classTypes,
      instructors,
      pricing,
      paidPublicPrices,
      publicSchedule,
      paymentConnections,
      hasPublishedBookingSurface,
    ] = await Promise.all([
      locationId
        ? db
            .select({ currency: organization.currency })
            .from(location)
            .innerJoin(organization, eq(organization.id, location.organizationId))
            .where(
              and(
                eq(location.id, locationId),
                eq(location.organizationId, organizationId),
                eq(location.isActive, true),
              ),
            )
            .limit(1)
        : db
            .select({ currency: organization.currency })
            .from(organization)
            .where(eq(organization.id, organizationId))
            .limit(1),
      db
        .select({ total: count() })
        .from(room)
        .where(
          and(
            eq(room.organizationId, organizationId),
            exactLocation(room.locationId, locationId),
          ),
        ),
      db
        .select({ total: count() })
        .from(classType)
        .where(
          and(
            eq(classType.organizationId, organizationId),
            exactLocation(classType.locationId, locationId),
            eq(classType.isActive, true),
          ),
        ),
      db
        .select({ total: count() })
        .from(instructor)
        .where(
          and(
            eq(instructor.organizationId, organizationId),
            exactLocation(instructor.locationId, locationId),
            eq(instructor.isActive, true),
            eq(instructor.isSystem, false),
            or(
              isNull(instructor.mindbodyTrainerId),
              sql`${instructor.customFields}->'raw'->>'Teacher' = 'True'`,
              sql`${instructor.customFields}->'raw'->>'AppointmentTrn' = 'True'`,
              sql`${instructor.customFields}->'raw'->>'ReservationTrn' = 'True'`,
              sql`${instructor.customFields}->'raw'->>'Workshop Instructor' = 'True'`,
            ),
          ),
        ),
      db
        .select({ currency: pricingOption.currency, price: pricingOption.price })
        .from(pricingOption)
        .where(
          and(
            eq(pricingOption.organizationId, organizationId),
            exactLocation(pricingOption.locationId, locationId),
            eq(pricingOption.isActive, true),
          ),
        ),
      db
        .select({ currency: pricingOption.currency, price: pricingOption.price })
        .from(pricingOption)
        .where(
          and(
            eq(pricingOption.organizationId, organizationId),
            exactLocation(pricingOption.locationId, locationId),
            eq(pricingOption.isActive, true),
            eq(pricingOption.isPublic, true),
            eq(pricingOption.isHidden, false),
            eq(pricingOption.directPurchaseEnabled, true),
            gt(pricingOption.price, "0"),
          ),
        ),
      getPublicScheduleInventory({
        scope,
        maxDaysAhead: 365,
        classTypeIds: [],
      }),
      db
        .select({
          chargesEnabled: stripeConnection.chargesEnabled,
          payoutsEnabled: stripeConnection.payoutsEnabled,
          detailsSubmitted: stripeConnection.detailsSubmitted,
        })
        .from(stripeConnection)
        .where(
          and(
            eq(stripeConnection.organizationId, organizationId),
            exactLocation(stripeConnection.locationId, locationId),
            eq(stripeConnection.isActive, true),
          ),
        )
        .limit(1),
      hasCurrentPublishedBookingSurface(scope),
    ]);

    const currency = workspaceRows[0]?.currency ?? "";
    const paymentConnection = paymentConnections[0];
    const paymentProviderReady = paymentConnection
      ? connectAccountStatus(paymentConnection).onboardingComplete
      : false;
    const paidPublicSalesEnabled = hasPaidPublicSale(paidPublicPrices);

    return {
      currency,
      ...buildLaunchpadReadiness({
        hasStudioProfile: workspaceRows.length > 0,
        hasRooms: (rooms[0]?.total ?? 0) > 0,
        hasClassTypes: (classTypes[0]?.total ?? 0) > 0,
        hasInstructors: (instructors[0]?.total ?? 0) > 0,
        hasValidPricing: pricing.some((row) =>
          isValidLocalPricing(row, currency),
        ),
        hasFutureBookableClass: publicSchedule.classes.length > 0,
        hasPublishedBookingSurface,
        paidPublicSalesEnabled,
        paymentProviderReady,
      }),
    };
  }),
});
