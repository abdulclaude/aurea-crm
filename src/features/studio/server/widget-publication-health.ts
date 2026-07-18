import "server-only";

import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  bookingEventType,
  calComCredential,
  instructor,
  pricingOption,
  widgetConfig,
} from "@/db/schema";
import {
  publishedBookingWidgetSourceSchema,
  publishedEventWidgetSourceSchema,
  publishedInstructorWidgetSourceSchema,
  publishedIntroOfferWidgetSourceSchema,
  publishedMembershipWidgetSourceSchema,
  publishedOnDemandWidgetSourceSchema,
  publishedReferralWidgetSourceSchema,
  publishedScheduleWidgetSourceSchema,
  storedPublicationSnapshotSchema,
} from "@/features/publications/public/contracts";
import type {
  PublishedWidgetTarget,
  WidgetScope,
} from "@/features/studio/server/widget-router-support";
import { toPublicInstructorProfile } from "@/features/studio/widgets/instructor-public-profile";
import { toPublicEventProgram } from "@/features/studio/widgets/event-public-program";
import { toPublicOnDemandAsset } from "@/features/studio/widgets/on-demand-public-asset";
import { toPublicReferralProgram } from "@/features/studio/widgets/referral-public-program";
import {
  selectPublicEventPrograms,
  selectPublicEventTimeZone,
  selectPublicFreeOnDemandAssets,
  selectPublicIntroOffers,
  selectPublicReferralPrograms,
} from "@/features/publications/server/widget-source-data";

type WidgetRow = typeof widgetConfig.$inferSelect;

export async function getWidgetPublicationHealth(input: {
  widgets: WidgetRow[];
  targets: PublishedWidgetTarget[];
  scope: WidgetScope;
}): Promise<Map<string, boolean>> {
  const targetBySourceId = new Map(
    input.targets.flatMap((target) =>
      target.sourceId ? [[target.sourceId, target] as const] : [],
    ),
  );
  const membershipVersions = new Map<string, string>();
  const instructorIds = new Set<string>();
  const bookingVersions = new Map<
    string,
    {
      title: string;
      description: string | null;
      length: number;
      locationType: string;
      credentialId: string;
      calEventTypeId: number;
      calUsername: string;
      slug: string;
    }
  >();
  const introOfferIds = new Set<string>();
  const eventServiceTypeIds = new Set<string>();
  const onDemandAssetIds = new Set<string>();
  const referralProgramIds = new Set<string>();
  const prelim = new Map<string, boolean>();

  for (const widget of input.widgets) {
    const target = targetBySourceId.get(widget.id);
    const envelope = target
      ? storedPublicationSnapshotSchema.safeParse(target.snapshot)
      : null;
    if (!target || !envelope?.success) {
      prelim.set(widget.id, false);
      continue;
    }
    const source = envelope.data.source;
    const schedule = publishedScheduleWidgetSourceSchema.safeParse(source);
    const instructorSource =
      publishedInstructorWidgetSourceSchema.safeParse(source);
    const membership = publishedMembershipWidgetSourceSchema.safeParse(source);
    const booking = publishedBookingWidgetSourceSchema.safeParse(source);
    const introOffer = publishedIntroOfferWidgetSourceSchema.safeParse(source);
    const eventSource = publishedEventWidgetSourceSchema.safeParse(source);
    const onDemand = publishedOnDemandWidgetSourceSchema.safeParse(source);
    const referralSource = publishedReferralWidgetSourceSchema.safeParse(source);
    const parsed = schedule.success
      ? schedule.data
      : instructorSource.success
        ? instructorSource.data
        : membership.success
          ? membership.data
          : booking.success
            ? booking.data
            : introOffer.success
              ? introOffer.data
              : eventSource.success
                ? eventSource.data
                : onDemand.success
                  ? onDemand.data
                  : referralSource.success
                    ? referralSource.data
                  : null;
    if (
      !parsed ||
      parsed.widget.id !== widget.id ||
      parsed.widget.locationId !== widget.locationId ||
      parsed.widget.updatedAt !== widget.updatedAt.toISOString()
    ) {
      prelim.set(widget.id, false);
      continue;
    }
    prelim.set(widget.id, true);
    if (instructorSource.success) {
      for (const profile of instructorSource.data.instructors) {
        instructorIds.add(profile.id);
      }
    } else if (membership.success) {
      for (const offer of membership.data.offers) {
        membershipVersions.set(offer.id, offer.updatedAt);
      }
    } else if (booking.success) {
      for (const event of booking.data.events) {
        bookingVersions.set(event.id, {
          title: event.title,
          description: event.description,
          length: event.length,
          locationType: event.locationType,
          credentialId: event.calComCredentialId,
          calEventTypeId: event.calEventTypeId,
          calUsername: event.calUsername,
          slug: event.slug,
        });
      }
    } else if (introOffer.success) {
      for (const offer of introOffer.data.offers) introOfferIds.add(offer.id);
    } else if (eventSource.success) {
      for (const event of eventSource.data.events) {
        eventServiceTypeIds.add(event.id);
      }
    } else if (onDemand.success) {
      for (const asset of onDemand.data.assets) {
        onDemandAssetIds.add(asset.id);
      }
    } else if (referralSource.success) {
      referralProgramIds.add(referralSource.data.program.id);
    }
  }

  const [liveMemberships, liveInstructors, liveBookings, liveIntroOffers, liveEvents, liveEventTimeZone, liveOnDemandAssets, liveReferralPrograms] = await Promise.all([
    selectLiveMembershipVersions([...membershipVersions.keys()], input.scope),
    selectLiveInstructorProfiles([...instructorIds], input.scope),
    selectLiveBookingVersions([...bookingVersions.keys()], input.scope),
    selectPublicIntroOffers({ ids: [...introOfferIds], scope: input.scope }),
    selectPublicEventPrograms({
      ids: [...eventServiceTypeIds],
      scope: input.scope,
      occurrencesPerEvent: 6,
    }),
    selectPublicEventTimeZone(input.scope),
    selectPublicFreeOnDemandAssets({
      ids: [...onDemandAssetIds],
      scope: input.scope,
    }),
    selectPublicReferralPrograms({
      ids: [...referralProgramIds],
      scope: input.scope,
    }),
  ]);
  const liveIntroById = new Map(liveIntroOffers.map((row) => [row.id, row]));
  const liveEventById = new Map(liveEvents.map((row) => [row.id, row]));
  const liveOnDemandById = new Map(
    liveOnDemandAssets.map((row) => [row.id, row]),
  );
  const liveReferralById = new Map(
    liveReferralPrograms.map((row) => [row.id, row]),
  );
  for (const widget of input.widgets) {
    if (!prelim.get(widget.id)) continue;
    const target = targetBySourceId.get(widget.id);
    const envelope = storedPublicationSnapshotSchema.safeParse(target?.snapshot);
    if (!envelope.success) continue;
    const instructors = publishedInstructorWidgetSourceSchema.safeParse(
      envelope.data.source,
    );
    const memberships = publishedMembershipWidgetSourceSchema.safeParse(
      envelope.data.source,
    );
    const bookings = publishedBookingWidgetSourceSchema.safeParse(
      envelope.data.source,
    );
    const introOffers = publishedIntroOfferWidgetSourceSchema.safeParse(
      envelope.data.source,
    );
    const events = publishedEventWidgetSourceSchema.safeParse(
      envelope.data.source,
    );
    const onDemand = publishedOnDemandWidgetSourceSchema.safeParse(
      envelope.data.source,
    );
    const referralSource = publishedReferralWidgetSourceSchema.safeParse(
      envelope.data.source,
    );
    if (
      (instructors.success &&
        instructors.data.instructors.some((row) => {
          const live = liveInstructors.get(row.id);
          return (
            !live ||
            JSON.stringify(
              toPublicInstructorProfile(
                live,
                instructors.data.widget.config,
              ),
            ) !== JSON.stringify(row)
          );
        })) ||
      (memberships.success &&
        memberships.data.offers.some(
          (row) => liveMemberships.get(row.id) !== row.updatedAt,
        )) ||
      (bookings.success &&
        bookings.data.events.some((row) => {
          const live = liveBookings.get(row.id);
          return (
            !live ||
            live.title.slice(0, 160) !== row.title ||
            (bookings.data.widget.config.showDescription
              ? (live.description?.slice(0, 2_000) ?? null) !== row.description
              : row.description !== null) ||
            live.length !== row.length ||
            live.locationType !== row.locationType ||
            live.credentialId !== row.calComCredentialId ||
            live.calEventTypeId !== row.calEventTypeId ||
            live.calUsername !== row.calUsername ||
            live.slug !== row.slug
          );
        })) ||
      (introOffers.success &&
        introOffers.data.offers.some((offer) => {
          const live = liveIntroById.get(offer.id);
          return (
            live?.updatedAt.toISOString() !== offer.updatedAt ||
            live.targetId !== offer.pricingTarget.id ||
            live.targetSlug !== offer.pricingTarget.slug ||
            live.targetVersionId !== offer.pricingTarget.versionId
          );
        })) ||
      (events.success &&
        (events.data.timezone !== liveEventTimeZone ||
          events.data.events.some((event) => {
            const live = liveEventById.get(event.id);
            return (
              !live ||
              JSON.stringify(
                toPublicEventProgram(live, events.data.widget.config),
              ) !== JSON.stringify(event)
            );
          }))) ||
      (onDemand.success &&
        onDemand.data.assets.some((asset) => {
          const live = liveOnDemandById.get(asset.id);
          return (
            !live ||
            JSON.stringify(
              toPublicOnDemandAsset(live, onDemand.data.widget.config),
            ) !== JSON.stringify(asset)
          );
        })) ||
      (referralSource.success &&
        (() => {
          const live = liveReferralById.get(referralSource.data.program.id);
          return (
            !live ||
            JSON.stringify(toPublicReferralProgram(live)) !==
              JSON.stringify(referralSource.data.program)
          );
        })())
    ) {
      prelim.set(widget.id, false);
    }
  }
  return prelim;
}

async function selectLiveMembershipVersions(ids: string[], scope: WidgetScope) {
  if (!ids.length) return new Map<string, string>();
  const rows = await db
    .select({ id: pricingOption.id, updatedAt: pricingOption.updatedAt })
    .from(pricingOption)
    .where(
      and(
        inArray(pricingOption.id, ids),
        eq(pricingOption.organizationId, scope.organizationId),
        scope.locationId
          ? eq(pricingOption.locationId, scope.locationId)
          : isNull(pricingOption.locationId),
        eq(pricingOption.type, "MEMBERSHIP"),
        eq(pricingOption.isActive, true),
        eq(pricingOption.isPublic, true),
        eq(pricingOption.isHidden, false),
      ),
    );
  return new Map(rows.map((row) => [row.id, row.updatedAt.toISOString()]));
}

async function selectLiveInstructorProfiles(ids: string[], scope: WidgetScope) {
  if (!ids.length) return new Map();
  const rows = await db
    .select({
      id: instructor.id,
      name: instructor.name,
      profilePhoto: instructor.profilePhoto,
      bio: instructor.bio,
      specialties: instructor.instructorSpecialties,
      certifications: instructor.instructorCertifications,
    })
    .from(instructor)
    .where(
      and(
        inArray(instructor.id, ids),
        eq(instructor.organizationId, scope.organizationId),
        scope.locationId
          ? eq(instructor.locationId, scope.locationId)
          : isNull(instructor.locationId),
        eq(instructor.isActive, true),
        eq(instructor.isSystem, false),
      ),
    );
  return new Map(rows.map((row) => [row.id, row]));
}

async function selectLiveBookingVersions(ids: string[], scope: WidgetScope) {
  if (!ids.length || !scope.locationId) return new Map();
  const rows = await db
    .select({
      id: bookingEventType.id,
      title: bookingEventType.title,
      description: bookingEventType.description,
      length: bookingEventType.length,
      locationType: bookingEventType.locationType,
      credentialId: calComCredential.id,
      calEventTypeId: bookingEventType.calEventTypeId,
      calUsername: calComCredential.calUsername,
      slug: bookingEventType.slug,
    })
    .from(bookingEventType)
    .innerJoin(
      calComCredential,
      and(
        eq(calComCredential.id, bookingEventType.calComCredentialId),
        eq(calComCredential.organizationId, bookingEventType.organizationId),
        eq(calComCredential.locationId, bookingEventType.locationId),
      ),
    )
    .where(
      and(
        inArray(bookingEventType.id, ids),
        eq(bookingEventType.organizationId, scope.organizationId),
        eq(bookingEventType.locationId, scope.locationId),
        eq(bookingEventType.isActive, true),
        eq(bookingEventType.isTeamEvent, false),
        eq(bookingEventType.requiresPayment, false),
        eq(bookingEventType.requiresConfirmation, false),
        isNotNull(bookingEventType.calEventTypeId),
        eq(calComCredential.isActive, true),
        isNotNull(calComCredential.apiKey),
        isNotNull(calComCredential.calUsername),
      ),
    );
  return new Map(
    rows.map((row) => [
      row.id,
      {
        title: row.title,
        description: row.description,
        length: row.length,
        locationType: row.locationType,
        credentialId: row.credentialId,
        calEventTypeId: row.calEventTypeId,
        calUsername: row.calUsername,
        slug: row.slug,
      },
    ]),
  );
}
