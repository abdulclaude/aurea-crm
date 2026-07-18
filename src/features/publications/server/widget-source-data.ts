import "server-only";

import {
  and,
  asc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import {
  bookingEventType,
  calComCredential,
  classType,
  instructor,
  location,
  pricingOption,
  publicationTarget,
  publicationVersion,
  referralProgram,
  serviceType,
  studioClass,
  videoOnDemandAsset,
} from "@/db/schema";
import {
  getPublishedPricingSnapshot,
  publishedPricingSourceIsCurrent,
} from "@/features/publications/public/pricing-snapshot";
import type { PublicationSourceScope } from "@/features/publications/server/source-types";
import { parsePublicMediaUrl } from "@/features/studio/widgets/public-media-url";
import type { PublicReferralProgram } from "@/features/studio/widgets/referral-public-program";

export async function selectPublicMembershipOffers(
  ids: string[],
  scope: PublicationSourceScope,
) {
  const rows = await db
    .select({
      id: pricingOption.id,
      name: pricingOption.name,
      description: pricingOption.description,
      price: pricingOption.price,
      currency: pricingOption.currency,
      billingInterval: pricingOption.billingInterval,
      classCredits: pricingOption.classCredits,
      durationDays: pricingOption.durationDays,
      accessSummary: pricingOption.accessSummary,
      updatedAt: pricingOption.updatedAt,
    })
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
  return inConfiguredOrder(ids, rows);
}

export async function selectPublicIntroOffers(input: {
  ids?: string[];
  search?: string;
  scope: PublicationSourceScope;
}) {
  if (input.ids?.length === 0) return [];
  const filters: SQL[] = [
    eq(pricingOption.organizationId, input.scope.organizationId),
    input.scope.locationId
      ? eq(pricingOption.locationId, input.scope.locationId)
      : isNull(pricingOption.locationId),
    eq(pricingOption.type, "INTRO_OFFER"),
    eq(pricingOption.isActive, true),
    eq(pricingOption.isPublic, true),
    eq(pricingOption.isHidden, false),
    eq(publicationTarget.organizationId, input.scope.organizationId),
    input.scope.locationId
      ? eq(publicationTarget.locationId, input.scope.locationId)
      : isNull(publicationTarget.locationId),
    eq(publicationTarget.kind, "PRICING"),
    eq(publicationTarget.status, "PUBLISHED"),
  ];
  if (input.ids) filters.push(inArray(pricingOption.id, input.ids));
  if (input.search) {
    filters.push(ilike(pricingOption.name, `%${input.search}%`));
  }
  const rows = await db
    .select({
      id: pricingOption.id,
      name: pricingOption.name,
      description: pricingOption.description,
      price: pricingOption.price,
      currency: pricingOption.currency,
      billingInterval: pricingOption.billingInterval,
      classCredits: pricingOption.classCredits,
      durationDays: pricingOption.durationDays,
      accessSummary: pricingOption.accessSummary,
      updatedAt: pricingOption.updatedAt,
      targetId: publicationTarget.id,
      targetSlug: publicationTarget.slug,
      targetVersionId: publicationTarget.publishedVersionId,
      targetSnapshot: publicationVersion.snapshot,
    })
    .from(pricingOption)
    .innerJoin(
      publicationTarget,
      eq(publicationTarget.sourceId, pricingOption.id),
    )
    .innerJoin(
      publicationVersion,
      and(
        eq(publicationVersion.id, publicationTarget.publishedVersionId),
        eq(publicationVersion.targetId, publicationTarget.id),
      ),
    )
    .where(and(...filters))
    .orderBy(asc(pricingOption.name), asc(pricingOption.id))
    .limit(100);
  const currentRows = rows.filter((row) => {
    if (!row.targetVersionId) return false;
    try {
      return publishedPricingSourceIsCurrent({
        snapshot: getPublishedPricingSnapshot(row.targetSnapshot),
        sourceId: row.id,
        sourceUpdatedAt: row.updatedAt,
      });
    } catch {
      return false;
    }
  });
  return input.ids
    ? inConfiguredOrder(input.ids, currentRows)
    : currentRows;
}

export async function selectPublicEventPrograms(input: {
  ids?: string[];
  search?: string;
  scope: PublicationSourceScope;
  occurrencesPerEvent?: number;
  occurrenceIds?: string[];
  includeEndedOccurrences?: boolean;
  now?: Date;
}) {
  if (input.ids?.length === 0) return [];
  const filters: SQL[] = [
    eq(serviceType.organizationId, input.scope.organizationId),
    input.scope.locationId
      ? eq(serviceType.locationId, input.scope.locationId)
      : isNull(serviceType.locationId),
    eq(serviceType.experienceType, "EVENT"),
    eq(serviceType.visibility, "PUBLIC"),
    eq(serviceType.isActive, true),
  ];
  if (input.ids) filters.push(inArray(serviceType.id, input.ids));
  if (input.search) filters.push(ilike(serviceType.name, `%${input.search}%`));
  const programs = await db
    .select({
      id: serviceType.id,
      name: serviceType.name,
      description: serviceType.description,
      imageUrl: serviceType.imageUrl,
      format: serviceType.format,
      defaultLocation: serviceType.defaultLocation,
      durationMinutes: serviceType.durationMinutes,
      price: serviceType.price,
      currency: serviceType.currency,
      updatedAt: serviceType.updatedAt,
    })
    .from(serviceType)
    .where(and(...filters))
    .orderBy(asc(serviceType.sortOrder), asc(serviceType.name), asc(serviceType.id))
    .limit(100);
  if (programs.length === 0) return [];
  const limit = Math.min(Math.max(input.occurrencesPerEvent ?? 6, 1), 6);
  const rankedOccurrences = db
    .select({
      id: studioClass.id,
      serviceTypeId: studioClass.serviceTypeId,
      name: studioClass.name,
      startTime: studioClass.startTime,
      endTime: studioClass.endTime,
      instructorName: studioClass.instructorName,
      location: studioClass.location,
      roomName: studioClass.roomName,
      isVirtual: studioClass.isVirtual,
      updatedAt: studioClass.updatedAt,
      occurrenceRank: sql<number>`row_number() over (
        partition by ${studioClass.serviceTypeId}
        order by ${studioClass.startTime}, ${studioClass.id}
      )`.as("occurrence_rank"),
    })
    .from(studioClass)
    .where(
      and(
        inArray(studioClass.serviceTypeId, programs.map((program) => program.id)),
        eq(studioClass.organizationId, input.scope.organizationId),
        input.scope.locationId
          ? eq(studioClass.locationId, input.scope.locationId)
          : isNull(studioClass.locationId),
        eq(studioClass.status, "SCHEDULED"),
        eq(studioClass.onlineBookingEnabled, true),
        input.occurrenceIds
          ? inArray(studioClass.id, input.occurrenceIds)
          : input.includeEndedOccurrences
            ? undefined
            : gte(studioClass.endTime, input.now ?? new Date()),
      ),
    )
    .as("ranked_event_occurrences");
  const occurrences = await db
    .select({
      id: rankedOccurrences.id,
      serviceTypeId: rankedOccurrences.serviceTypeId,
      name: rankedOccurrences.name,
      startTime: rankedOccurrences.startTime,
      endTime: rankedOccurrences.endTime,
      instructorName: rankedOccurrences.instructorName,
      location: rankedOccurrences.location,
      roomName: rankedOccurrences.roomName,
      isVirtual: rankedOccurrences.isVirtual,
      updatedAt: rankedOccurrences.updatedAt,
    })
    .from(rankedOccurrences)
    .where(lte(rankedOccurrences.occurrenceRank, limit))
    .orderBy(asc(rankedOccurrences.startTime), asc(rankedOccurrences.id));
  const occurrencesByService = new Map<string, typeof occurrences>();
  for (const occurrence of occurrences) {
    if (!occurrence.serviceTypeId) continue;
    const current = occurrencesByService.get(occurrence.serviceTypeId) ?? [];
    if (current.length < limit) current.push(occurrence);
    occurrencesByService.set(occurrence.serviceTypeId, current);
  }
  const eligible = programs.flatMap((program) => {
    const upcoming = occurrencesByService.get(program.id) ?? [];
    return upcoming.length > 0 ? [{ ...program, occurrences: upcoming }] : [];
  });
  return input.ids ? inConfiguredOrder(input.ids, eligible) : eligible;
}

export async function selectPublicEventTimeZone(
  scope: PublicationSourceScope,
): Promise<string> {
  if (!scope.locationId) return "UTC";
  const [row] = await db
    .select({ timezone: location.timezone })
    .from(location)
    .where(
      and(
        eq(location.id, scope.locationId),
        eq(location.organizationId, scope.organizationId),
        eq(location.isActive, true),
      ),
    )
    .limit(1);
  return safeTimeZone(row?.timezone);
}

function safeTimeZone(value: string | null | undefined): string {
  if (!value || value.length > 100) return "UTC";
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: value }).format();
    return value;
  } catch {
    return "UTC";
  }
}

export async function selectPublicInstructorProfiles(
  ids: string[],
  scope: PublicationSourceScope,
) {
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
  return inConfiguredOrder(ids, rows);
}

export async function selectPublicBookingEvents(
  ids: string[],
  scope: PublicationSourceScope,
) {
  if (!scope.locationId) return [];
  const rows = await db
    .select({
      id: bookingEventType.id,
      title: bookingEventType.title,
      description: bookingEventType.description,
      length: bookingEventType.length,
      locationType: bookingEventType.locationType,
      calEventTypeId: bookingEventType.calEventTypeId,
      calComCredentialId: bookingEventType.calComCredentialId,
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
        isNotNull(bookingEventType.calComCredentialId),
        eq(calComCredential.isActive, true),
        isNotNull(calComCredential.apiKey),
        isNotNull(calComCredential.calUsername),
      ),
    );
  return inConfiguredOrder(ids, rows);
}

export async function selectPublicFreeOnDemandAssets(input: {
  ids?: string[];
  search?: string;
  scope: PublicationSourceScope;
}) {
  if (input.ids?.length === 0) return [];
  const filters: SQL[] = [
    eq(videoOnDemandAsset.organizationId, input.scope.organizationId),
    input.scope.locationId
      ? eq(videoOnDemandAsset.locationId, input.scope.locationId)
      : isNull(videoOnDemandAsset.locationId),
    eq(videoOnDemandAsset.accessLevel, "PUBLIC"),
    eq(videoOnDemandAsset.isPublished, true),
    isNotNull(videoOnDemandAsset.publishedAt),
    sql`(${videoOnDemandAsset.price} IS NULL OR ${videoOnDemandAsset.price} = 0)`,
  ];
  if (input.ids) filters.push(inArray(videoOnDemandAsset.id, input.ids));
  if (input.search) {
    filters.push(ilike(videoOnDemandAsset.title, `%${input.search}%`));
  }
  const rows = await db
    .select({
      id: videoOnDemandAsset.id,
      title: videoOnDemandAsset.title,
      description: videoOnDemandAsset.description,
      videoUrl: videoOnDemandAsset.videoUrl,
      thumbnailUrl: videoOnDemandAsset.thumbnailUrl,
      durationSeconds: videoOnDemandAsset.durationSeconds,
      instructorName: instructor.name,
      classTypeName: classType.name,
      updatedAt: videoOnDemandAsset.updatedAt,
    })
    .from(videoOnDemandAsset)
    .leftJoin(
      instructor,
      and(
        eq(instructor.id, videoOnDemandAsset.instructorId),
        eq(instructor.organizationId, videoOnDemandAsset.organizationId),
        input.scope.locationId
          ? eq(instructor.locationId, input.scope.locationId)
          : isNull(instructor.locationId),
        eq(instructor.isActive, true),
        eq(instructor.isSystem, false),
      ),
    )
    .leftJoin(
      classType,
      and(
        eq(classType.id, videoOnDemandAsset.classTypeId),
        eq(classType.organizationId, videoOnDemandAsset.organizationId),
        input.scope.locationId
          ? eq(classType.locationId, input.scope.locationId)
          : isNull(classType.locationId),
        eq(classType.isActive, true),
      ),
    )
    .where(and(...filters))
    .orderBy(asc(videoOnDemandAsset.title), asc(videoOnDemandAsset.id))
    .limit(100);
  const safeRows = rows.flatMap((row) => {
    const videoUrl = parsePublicMediaUrl(row.videoUrl);
    if (!videoUrl) return [];
    const thumbnailUrl = row.thumbnailUrl
      ? parsePublicMediaUrl(row.thumbnailUrl)
      : null;
    return [{ ...row, videoUrl, thumbnailUrl }];
  });
  return input.ids ? inConfiguredOrder(input.ids, safeRows) : safeRows;
}

export async function selectPublicReferralPrograms(input: {
  ids?: string[];
  search?: string;
  scope: PublicationSourceScope;
}): Promise<PublicReferralProgram[]> {
  if (input.ids?.length === 0) return [];
  const filters: SQL[] = [
    eq(referralProgram.organizationId, input.scope.organizationId),
    input.scope.locationId
      ? eq(referralProgram.locationId, input.scope.locationId)
      : isNull(referralProgram.locationId),
    eq(referralProgram.isActive, true),
  ];
  if (input.ids) filters.push(inArray(referralProgram.id, input.ids));
  if (input.search) {
    filters.push(ilike(referralProgram.name, `%${input.search}%`));
  }
  const rows = await db
    .select({
      id: referralProgram.id,
      name: referralProgram.name,
      referrerRewardType: referralProgram.referrerRewardType,
      referrerRewardValue: referralProgram.referrerRewardValue,
      refereeRewardType: referralProgram.refereeRewardType,
      refereeRewardValue: referralProgram.refereeRewardValue,
      currency: referralProgram.currency,
      refereeOfferDays: referralProgram.refereeOfferDays,
      isActive: referralProgram.isActive,
      updatedAt: referralProgram.updatedAt,
    })
    .from(referralProgram)
    .where(and(...filters))
    .orderBy(asc(referralProgram.name), asc(referralProgram.id))
    .limit(25);
  return input.ids ? inConfiguredOrder(input.ids, rows) : rows;
}

function inConfiguredOrder<T extends { id: string }>(
  ids: string[],
  rows: T[],
): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}
