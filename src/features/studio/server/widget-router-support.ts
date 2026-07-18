import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  instructor,
  bookingEventType,
  calComCredential,
  organization,
  classType,
  pricingOption,
  publicationTarget,
  publicationVersion,
  widgetConfig,
} from "@/db/schema";
import { buildPublishedWidgetEmbed } from "@/features/studio/widgets/embed-code";
import {
  bookingWidgetConfigSchema,
  type BookingWidgetConfig,
  eventWidgetConfigSchema,
  type EventWidgetConfig,
  instructorWidgetConfigSchema,
  type InstructorWidgetConfig,
  introOfferWidgetConfigSchema,
  type IntroOfferWidgetConfig,
  membershipWidgetConfigSchema,
  type MembershipWidgetConfig,
  onDemandWidgetConfigSchema,
  type OnDemandWidgetConfig,
  referralWidgetConfigSchema,
  type ReferralWidgetConfig,
  scheduleWidgetConfigSchema,
  type ScheduleWidgetConfig,
} from "@/features/studio/widgets/contracts";
import {
  selectPublicEventPrograms,
  selectPublicFreeOnDemandAssets,
  selectPublicIntroOffers,
  selectPublicReferralPrograms,
} from "@/features/publications/server/widget-source-data";

export type WidgetScope = {
  organizationId: string;
  locationId: string | null;
};

export type PublishedWidgetTarget = {
  sourceId: string | null;
  slug: string;
  snapshot: unknown;
};

export function widgetScopeWhere(scope: WidgetScope) {
  return and(
    eq(widgetConfig.organizationId, scope.organizationId),
    scope.locationId
      ? eq(widgetConfig.locationId, scope.locationId)
      : isNull(widgetConfig.locationId),
  );
}

export function targetScopeWhere(scope: WidgetScope) {
  return and(
    eq(publicationTarget.organizationId, scope.organizationId),
    scope.locationId
      ? eq(publicationTarget.locationId, scope.locationId)
      : isNull(publicationTarget.locationId),
  );
}

function toJsonValue(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, toJsonValue(item)]),
  );
}

export function buildWidgetEmbed(input: {
  widget: typeof widgetConfig.$inferSelect;
  target: PublishedWidgetTarget | null;
  organizationSlug: string;
}) {
  return buildPublishedWidgetEmbed(input);
}

export function serializeWidget(input: {
  widget: typeof widgetConfig.$inferSelect;
  target: PublishedWidgetTarget | null;
  organizationSlug: string;
  publicationCurrent: boolean;
}) {
  return {
    ...input.widget,
    config: toJsonValue(input.widget.config),
    publicationState: input.target
      ? input.publicationCurrent
        ? "CURRENT"
        : "REPUBLISH_REQUIRED"
      : "UNPUBLISHED",
    embed: input.publicationCurrent ? buildWidgetEmbed(input) : null,
  };
}

export function requireWidgetScope(ctx: {
  orgId: string | null;
  locationId: string | null;
}): WidgetScope {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select an organization to manage widgets.",
    });
  }
  return { organizationId: ctx.orgId, locationId: ctx.locationId };
}

export async function getWidgetOrThrow(id: string, scope: WidgetScope) {
  const [widget] = await db
    .select()
    .from(widgetConfig)
    .where(and(eq(widgetConfig.id, id), widgetScopeWhere(scope)))
    .limit(1);
  if (!widget) throw new TRPCError({ code: "NOT_FOUND" });
  return widget;
}

export async function getPublishedWidgetTarget(
  id: string,
  scope: WidgetScope,
) {
  const [target] = await db
    .select({
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
        eq(publicationTarget.kind, "WIDGET"),
        eq(publicationTarget.sourceId, id),
        eq(publicationTarget.status, "PUBLISHED"),
      ),
    )
    .limit(1);
  return target ?? null;
}

export async function getOrganizationSlug(organizationId: string) {
  const [row] = await db
    .select({ slug: organization.slug })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  return row.slug;
}

export async function validateScheduleWidgetConfig(
  config: ScheduleWidgetConfig,
  scope: WidgetScope,
) {
  const parsed = scheduleWidgetConfigSchema.parse(config);
  if (parsed.classTypeIds.length === 0) return parsed;
  const rows = await db
    .select({ id: classType.id })
    .from(classType)
    .where(
      and(
        inArray(classType.id, parsed.classTypeIds),
        eq(classType.organizationId, scope.organizationId),
        scope.locationId
          ? eq(classType.locationId, scope.locationId)
          : isNull(classType.locationId),
        eq(classType.isActive, true),
      ),
    );
  if (rows.length !== parsed.classTypeIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more class type filters are unavailable in this location.",
    });
  }
  return parsed;
}

export async function validateInstructorWidgetConfig(
  config: InstructorWidgetConfig,
  scope: WidgetScope,
): Promise<InstructorWidgetConfig> {
  const parsed = instructorWidgetConfigSchema.parse(config);
  const rows = await db
    .select({ id: instructor.id })
    .from(instructor)
    .where(
      and(
        inArray(instructor.id, parsed.instructorIds),
        eq(instructor.organizationId, scope.organizationId),
        scope.locationId
          ? eq(instructor.locationId, scope.locationId)
          : isNull(instructor.locationId),
        eq(instructor.isActive, true),
        eq(instructor.isSystem, false),
      ),
    );
  if (rows.length !== parsed.instructorIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more instructors are unavailable in this location.",
    });
  }
  return parsed;
}

export async function validateMembershipWidgetConfig(
  config: MembershipWidgetConfig,
  scope: WidgetScope,
): Promise<MembershipWidgetConfig> {
  const parsed = membershipWidgetConfigSchema.parse(config);
  const rows = await db
    .select({ id: pricingOption.id })
    .from(pricingOption)
    .where(
      and(
        inArray(pricingOption.id, parsed.pricingOptionIds),
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
  if (rows.length !== parsed.pricingOptionIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "One or more membership options are unavailable in this location.",
    });
  }
  return parsed;
}

export async function validateIntroOfferWidgetConfig(
  config: IntroOfferWidgetConfig,
  scope: WidgetScope,
): Promise<IntroOfferWidgetConfig> {
  const parsed = introOfferWidgetConfigSchema.parse(config);
  const rows = await selectPublicIntroOffers({
    ids: parsed.pricingOptionIds,
    scope,
  });
  if (rows.length !== parsed.pricingOptionIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Each intro offer must have a current published pricing target in this location.",
    });
  }
  return parsed;
}

export async function validateEventWidgetConfig(
  config: EventWidgetConfig,
  scope: WidgetScope,
): Promise<EventWidgetConfig> {
  const parsed = eventWidgetConfigSchema.parse(config);
  const rows = await selectPublicEventPrograms({
    ids: parsed.serviceTypeIds,
    scope,
    occurrencesPerEvent: parsed.occurrencesPerEvent,
  });
  if (rows.length !== parsed.serviceTypeIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Each event must be public, active, and have an upcoming scheduled date in this location.",
    });
  }
  return parsed;
}

export async function validateOnDemandWidgetConfig(
  config: OnDemandWidgetConfig,
  scope: WidgetScope,
): Promise<OnDemandWidgetConfig> {
  const parsed = onDemandWidgetConfigSchema.parse(config);
  const rows = await selectPublicFreeOnDemandAssets({
    ids: parsed.assetIds,
    scope,
  });
  if (rows.length !== parsed.assetIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Each video must be published, public, free, and use a credential-free HTTPS media URL in this location.",
    });
  }
  return parsed;
}

export async function validateReferralWidgetConfig(
  config: ReferralWidgetConfig,
  scope: WidgetScope,
): Promise<ReferralWidgetConfig> {
  const parsed = referralWidgetConfigSchema.parse(config);
  const rows = await selectPublicReferralPrograms({
    ids: [parsed.programId],
    scope,
  });
  if (rows.length !== 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Select an active referral program in this workspace.",
    });
  }
  return parsed;
}

export async function validateBookingWidgetConfig(
  config: BookingWidgetConfig,
  scope: WidgetScope,
): Promise<BookingWidgetConfig> {
  const parsed = bookingWidgetConfigSchema.parse(config);
  if (!scope.locationId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Select a location before configuring appointment booking.",
    });
  }
  const rows = await db
    .select({ id: bookingEventType.id })
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
        inArray(bookingEventType.id, parsed.eventTypeIds),
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
  if (rows.length !== parsed.eventTypeIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "One or more appointment types are unavailable for public booking in this location.",
    });
  }
  return parsed;
}
