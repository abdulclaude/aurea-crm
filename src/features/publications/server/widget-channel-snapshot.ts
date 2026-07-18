import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { organization, widgetConfig } from "@/db/schema";
import {
  locationBranding,
  organizationBranding,
} from "@/features/publications/server/brand-snapshot";
import type { PublicationSourceScope } from "@/features/publications/server/source-types";
import {
  selectPublicInstructorProfiles,
  selectPublicBookingEvents,
  selectPublicEventPrograms,
  selectPublicEventTimeZone,
  selectPublicIntroOffers,
  selectPublicReferralPrograms,
  selectPublicMembershipOffers,
  selectPublicFreeOnDemandAssets,
} from "@/features/publications/server/widget-source-data";
import {
  bookingWidgetConfigSchema,
  eventWidgetConfigSchema,
  instructorWidgetConfigSchema,
  introOfferWidgetConfigSchema,
  membershipWidgetConfigSchema,
  onDemandWidgetConfigSchema,
  referralWidgetConfigSchema,
  scheduleWidgetConfigSchema,
} from "@/features/studio/widgets/contracts";
import { sanitizeMembershipDescription } from "@/features/studio/widgets/membership-description";
import { toPublicInstructorProfile } from "@/features/studio/widgets/instructor-public-profile";
import { toPublicOnDemandAsset } from "@/features/studio/widgets/on-demand-public-asset";
import { toPublicEventProgram } from "@/features/studio/widgets/event-public-program";
import { toPublicReferralProgram } from "@/features/studio/widgets/referral-public-program";

const invalidWidgetSnapshot = {
  type: "WIDGET",
  widget: null,
  brand: null,
} as const;

export async function buildWidgetChannelSnapshot(input: {
  sourceId: string;
  scope: PublicationSourceScope;
}): Promise<unknown> {
  const [row] = await db
    .select({
      id: widgetConfig.id,
      name: widgetConfig.name,
      type: widgetConfig.type,
      locationId: widgetConfig.locationId,
      config: widgetConfig.config,
      isActive: widgetConfig.isActive,
      updatedAt: widgetConfig.updatedAt,
    })
    .from(widgetConfig)
    .where(
      and(
        eq(widgetConfig.id, input.sourceId),
        eq(widgetConfig.organizationId, input.scope.organizationId),
        input.scope.locationId
          ? eq(widgetConfig.locationId, input.scope.locationId)
          : isNull(widgetConfig.locationId),
      ),
    )
    .limit(1);
  if (!row?.isActive) return invalidWidgetSnapshot;
  const brand = input.scope.locationId
    ? await locationBranding(
        input.scope.organizationId,
        input.scope.locationId,
      )
    : await organizationBranding(input.scope.organizationId);
  if (row.type === "SCHEDULE") {
    const config = scheduleWidgetConfigSchema.safeParse(row.config);
    return config.success
      ? { type: "WIDGET", widget: { ...row, config: config.data }, brand }
      : invalidWidgetSnapshot;
  }
  if (row.type === "BOOKING") {
    const config = bookingWidgetConfigSchema.safeParse(row.config);
    if (!config.success || !row.locationId) return invalidWidgetSnapshot;
    const events = await selectPublicBookingEvents(
      config.data.eventTypeIds,
      input.scope,
    );
    if (events.length !== config.data.eventTypeIds.length) {
      return invalidWidgetSnapshot;
    }
    return {
      type: "WIDGET",
      widget: { ...row, config: config.data },
      brand,
      events: events.map((event) => ({
        id: event.id,
        title: event.title.slice(0, 160),
        description: config.data.showDescription
          ? event.description?.slice(0, 2_000) ?? null
          : null,
        length: event.length,
        locationType: event.locationType,
        calEventTypeId: event.calEventTypeId,
        calComCredentialId: event.calComCredentialId,
        calUsername: event.calUsername,
        slug: event.slug,
      })),
    };
  }
  if (row.type === "MEMBERSHIP") {
    const config = membershipWidgetConfigSchema.safeParse(row.config);
    if (!config.success) return invalidWidgetSnapshot;
    const offers = await selectPublicMembershipOffers(
      config.data.pricingOptionIds,
      input.scope,
    );
    if (offers.length !== config.data.pricingOptionIds.length) {
      return invalidWidgetSnapshot;
    }
    return {
      type: "WIDGET",
      widget: { ...row, config: config.data },
      brand,
      offers: offers.map((offer) => ({
        id: offer.id,
        name: offer.name.slice(0, 160),
        descriptionHtml: config.data.showDescription
          ? sanitizeMembershipDescription(offer.description)
          : null,
        price: offer.price,
        currency: offer.currency,
        billingInterval: offer.billingInterval,
        classCredits: offer.classCredits,
        durationDays: offer.durationDays,
        accessSummary: config.data.showAccessSummary
          ? offer.accessSummary?.slice(0, 500) ?? null
          : null,
        updatedAt: offer.updatedAt,
      })),
    };
  }
  if (row.type === "INTRO_OFFER") {
    const config = introOfferWidgetConfigSchema.safeParse(row.config);
    if (!config.success) return invalidWidgetSnapshot;
    const [offers, organizationRows] = await Promise.all([
      selectPublicIntroOffers({
        ids: config.data.pricingOptionIds,
        scope: input.scope,
      }),
      db
        .select({ slug: organization.slug })
        .from(organization)
        .where(eq(organization.id, input.scope.organizationId))
        .limit(1),
    ]);
    if (
      offers.length !== config.data.pricingOptionIds.length ||
      !organizationRows[0]
    ) {
      return invalidWidgetSnapshot;
    }
    return {
      type: "WIDGET",
      widget: { ...row, config: config.data },
      brand,
      organizationSlug: organizationRows[0].slug,
      offers: offers.map((offer) => ({
        id: offer.id,
        name: offer.name.slice(0, 160),
        descriptionHtml: config.data.showDescription
          ? sanitizeMembershipDescription(offer.description)
          : null,
        price: offer.price,
        currency: offer.currency,
        billingInterval: offer.billingInterval,
        classCredits: offer.classCredits,
        durationDays: offer.durationDays,
        accessSummary: config.data.showAccessSummary
          ? offer.accessSummary?.slice(0, 500) ?? null
          : null,
        updatedAt: offer.updatedAt,
        pricingTarget: {
          id: offer.targetId,
          slug: offer.targetSlug,
          versionId: offer.targetVersionId,
        },
      })),
    };
  }
  if (row.type === "EVENT") {
    const config = eventWidgetConfigSchema.safeParse(row.config);
    if (!config.success) return invalidWidgetSnapshot;
    const [events, timezone] = await Promise.all([
      selectPublicEventPrograms({
        ids: config.data.serviceTypeIds,
        scope: input.scope,
        occurrencesPerEvent: config.data.occurrencesPerEvent,
      }),
      selectPublicEventTimeZone(input.scope),
    ]);
    if (events.length !== config.data.serviceTypeIds.length) {
      return invalidWidgetSnapshot;
    }
    return {
      type: "WIDGET",
      widget: { ...row, config: config.data },
      brand,
      timezone,
      events: events.map((event) => toPublicEventProgram(event, config.data)),
    };
  }
  if (row.type === "ON_DEMAND") {
    const config = onDemandWidgetConfigSchema.safeParse(row.config);
    if (!config.success) return invalidWidgetSnapshot;
    const assets = await selectPublicFreeOnDemandAssets({
      ids: config.data.assetIds,
      scope: input.scope,
    });
    if (assets.length !== config.data.assetIds.length) {
      return invalidWidgetSnapshot;
    }
    return {
      type: "WIDGET",
      widget: { ...row, config: config.data },
      brand,
      assets: assets.map((asset) => toPublicOnDemandAsset(asset, config.data)),
    };
  }
  if (row.type === "REFERRAL") {
    const config = referralWidgetConfigSchema.safeParse(row.config);
    if (!config.success) return invalidWidgetSnapshot;
    const programs = await selectPublicReferralPrograms({
      ids: [config.data.programId],
      scope: input.scope,
    });
    const program = programs[0];
    if (!program) return invalidWidgetSnapshot;
    return {
      type: "WIDGET",
      widget: { ...row, config: config.data },
      brand,
      program: toPublicReferralProgram(program),
    };
  }
  if (row.type !== "INSTRUCTORS") return invalidWidgetSnapshot;
  const config = instructorWidgetConfigSchema.safeParse(row.config);
  if (!config.success) return invalidWidgetSnapshot;
  const profiles = await selectPublicInstructorProfiles(
    config.data.instructorIds,
    input.scope,
  );
  if (profiles.length !== config.data.instructorIds.length) {
    return invalidWidgetSnapshot;
  }
  return {
    type: "WIDGET",
    widget: { ...row, config: config.data },
    brand,
    instructors: profiles.map((profile) =>
      toPublicInstructorProfile(profile, config.data),
    ),
  };
}
