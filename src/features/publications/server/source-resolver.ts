import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, isNull, ne } from "drizzle-orm";

import { db } from "@/db";
import {
  form,
  funnel,
  location,
  organization,
  pricingOption,
  widgetConfig,
} from "@/db/schema";
import type { PublicationKind } from "@/features/publications/contracts";
import { getPublicationReadiness } from "@/features/publications/lib/publication-policy";
import type {
  PublicationSource,
  PublicationSourceScope,
} from "@/features/publications/server/source-types";

function sourceNotFound(): never {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "The publication source is not available in this workspace.",
  });
}

function toSource(input: {
  kind: PublicationKind;
  sourceKey: string;
  sourceId: string;
  name: string;
  locationId: string | null;
  updatedAt: Date | null;
  available?: boolean;
  unavailableReason?: string | null;
}): PublicationSource {
  const readiness = getPublicationReadiness(input.kind);
  const available = input.available ?? true;
  return {
    kind: input.kind,
    sourceKey: input.sourceKey,
    sourceId: input.sourceId,
    name: input.name,
    locationId: input.locationId,
    updatedAt: input.updatedAt?.toISOString() ?? null,
    publishable: readiness.publishable && available,
    unavailableReason: readiness.reason ?? input.unavailableReason ?? null,
    targetId: null,
  };
}

function parseSourceId(sourceKey: string, prefix: string): string {
  if (!sourceKey.startsWith(prefix)) sourceNotFound();
  const id = sourceKey.slice(prefix.length);
  if (!id) sourceNotFound();
  return id;
}

function parseContextualWidgetId(
  sourceKey: string,
  locationId: string | null,
): string {
  const suffix = locationId ? `:location:${locationId}` : ":organization";
  if (!sourceKey.startsWith("widget:") || !sourceKey.endsWith(suffix)) {
    sourceNotFound();
  }
  const id = sourceKey.slice("widget:".length, -suffix.length);
  if (!id) sourceNotFound();
  return id;
}

export async function resolvePublicationSource(input: {
  scope: PublicationSourceScope;
  kind: PublicationKind;
  sourceKey: string;
}): Promise<PublicationSource> {
  const { scope, kind, sourceKey } = input;
  if (kind === "FUNNEL") {
    const id = parseSourceId(sourceKey, "funnel:");
    const [row] = await db
      .select({
        id: funnel.id,
        name: funnel.name,
        locationId: funnel.locationId,
        updatedAt: funnel.updatedAt,
      })
      .from(funnel)
      .where(
        and(
          eq(funnel.id, id),
          eq(funnel.organizationId, scope.organizationId),
          scope.locationId
            ? eq(funnel.locationId, scope.locationId)
            : isNull(funnel.locationId),
        ),
      )
      .limit(1);
    if (!row) sourceNotFound();
    return toSource({
      kind,
      sourceKey,
      sourceId: row.id,
      name: row.name,
      locationId: row.locationId,
      updatedAt: row.updatedAt,
    });
  }

  if (kind === "FORM") {
    const id = parseSourceId(sourceKey, "form:");
    const [row] = await db
      .select({
        id: form.id,
        name: form.name,
        locationId: form.locationId,
        updatedAt: form.updatedAt,
      })
      .from(form)
      .where(
        and(
          eq(form.id, id),
          eq(form.organizationId, scope.organizationId),
          scope.locationId
            ? eq(form.locationId, scope.locationId)
            : isNull(form.locationId),
          ne(form.status, "ARCHIVED"),
        ),
      )
      .limit(1);
    if (!row) sourceNotFound();
    return toSource({
      kind,
      sourceKey,
      sourceId: row.id,
      name: row.name,
      locationId: row.locationId,
      updatedAt: row.updatedAt,
    });
  }

  if (kind === "PRICING") {
    const id = parseSourceId(sourceKey, "pricing:");
    const [row] = await db
      .select({
        id: pricingOption.id,
        name: pricingOption.name,
        locationId: pricingOption.locationId,
        updatedAt: pricingOption.updatedAt,
        isActive: pricingOption.isActive,
        isPublic: pricingOption.isPublic,
        isHidden: pricingOption.isHidden,
      })
      .from(pricingOption)
      .where(
        and(
          eq(pricingOption.id, id),
          eq(pricingOption.organizationId, scope.organizationId),
          scope.locationId
            ? eq(pricingOption.locationId, scope.locationId)
            : isNull(pricingOption.locationId),
        ),
      )
      .limit(1);
    if (!row) sourceNotFound();
    const available = row.isActive && row.isPublic && !row.isHidden;
    return toSource({
      kind,
      sourceKey,
      sourceId: row.id,
      name: row.name,
      locationId: row.locationId,
      updatedAt: row.updatedAt,
      available,
      unavailableReason: available
        ? null
        : "Make this pricing option active, public, and visible before publishing.",
    });
  }

  if (kind === "SCHEDULE") {
    const organizationKey = `schedule:organization:${scope.organizationId}`;
    if (sourceKey === organizationKey && !scope.locationId) {
      const [row] = await db
        .select({ id: organization.id, name: organization.name })
        .from(organization)
        .where(eq(organization.id, scope.organizationId))
        .limit(1);
      if (!row) sourceNotFound();
      return toSource({
        kind,
        sourceKey,
        sourceId: row.id,
        name: `${row.name} schedule`,
        locationId: null,
        updatedAt: null,
      });
    }
    if (!scope.locationId) sourceNotFound();
    const id = parseSourceId(sourceKey, "schedule:location:");
    const [row] = await db
      .select({
        id: location.id,
        name: location.companyName,
        updatedAt: location.updatedAt,
      })
      .from(location)
      .where(
        and(
          eq(location.id, id),
          eq(location.organizationId, scope.organizationId),
          eq(location.id, scope.locationId),
          eq(location.isActive, true),
        ),
      )
      .limit(1);
    if (!row) sourceNotFound();
    return toSource({
      kind,
      sourceKey,
      sourceId: row.id,
      name: `${row.name} schedule`,
      locationId: row.id,
      updatedAt: row.updatedAt,
    });
  }

  if (kind === "GIFT_CARDS") {
    if (
      scope.locationId ||
      sourceKey !== `gift-cards:${scope.organizationId}`
    ) {
      sourceNotFound();
    }
    const [row] = await db
      .select({ id: organization.id, name: organization.name })
      .from(organization)
      .where(eq(organization.id, scope.organizationId))
      .limit(1);
    if (!row) sourceNotFound();
    return toSource({
      kind,
      sourceKey,
      sourceId: row.id,
      name: `${row.name} gift cards`,
      locationId: null,
      updatedAt: null,
    });
  }

  const id = parseContextualWidgetId(sourceKey, scope.locationId);
  const [row] = await db
    .select({
      id: widgetConfig.id,
      name: widgetConfig.name,
      type: widgetConfig.type,
      locationId: widgetConfig.locationId,
      updatedAt: widgetConfig.updatedAt,
      isActive: widgetConfig.isActive,
    })
    .from(widgetConfig)
    .where(
      and(
        eq(widgetConfig.id, id),
        eq(widgetConfig.organizationId, scope.organizationId),
        scope.locationId
          ? eq(widgetConfig.locationId, scope.locationId)
          : isNull(widgetConfig.locationId),
      ),
    )
    .limit(1);
  if (!row) sourceNotFound();
  return toSource({
    kind,
    sourceKey,
    sourceId: row.id,
    name: row.name,
    locationId: row.locationId,
    updatedAt: row.updatedAt,
    available:
      row.isActive &&
      (row.type !== "BOOKING" || row.locationId !== null) &&
      (row.type === "SCHEDULE" ||
        row.type === "BOOKING" ||
        row.type === "INSTRUCTORS" ||
        row.type === "MEMBERSHIP" ||
        row.type === "INTRO_OFFER" ||
        row.type === "EVENT" ||
        row.type === "ON_DEMAND" ||
        row.type === "REFERRAL"),
    unavailableReason: !row.isActive
      ? "Activate this widget before publishing."
      : row.type === "BOOKING" && row.locationId === null
        ? "Appointment booking widgets require an active location."
      : row.type !== "SCHEDULE" &&
          row.type !== "BOOKING" &&
          row.type !== "INSTRUCTORS" &&
          row.type !== "MEMBERSHIP" &&
          row.type !== "INTRO_OFFER" &&
          row.type !== "EVENT" &&
          row.type !== "ON_DEMAND" &&
          row.type !== "REFERRAL"
        ? "This widget type does not have a public renderer yet."
        : null,
  });
}
