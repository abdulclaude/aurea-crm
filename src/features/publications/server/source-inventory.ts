import "server-only";

import { and, asc, eq, isNull, ne } from "drizzle-orm";

import { db } from "@/db";
import {
  form,
  location,
  organization,
  pricingOption,
  publicationTarget,
  widgetConfig,
} from "@/db/schema";
import type { PublicationKind } from "@/features/publications/contracts";
import { getPublicationReadiness } from "@/features/publications/lib/publication-policy";
import type {
  PublicationSource,
  PublicationSourceScope,
} from "@/features/publications/server/source-types";

const INVENTORY_LIMIT_PER_KIND = 250;

function source(input: {
  kind: PublicationKind;
  sourceKey: string;
  sourceId: string;
  name: string;
  locationId: string | null;
  updatedAt: Date | null;
  targetId: string | null;
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
    targetId: input.targetId,
    updatedAt: input.updatedAt?.toISOString() ?? null,
    publishable: readiness.publishable && available,
    unavailableReason: readiness.reason ?? input.unavailableReason ?? null,
  };
}

export async function getPublicationSourceInventory(
  scope: PublicationSourceScope,
): Promise<PublicationSource[]> {
  const exactLocation = scope.locationId ?? undefined;
  const [
    formRows,
    pricingRows,
    locationRows,
    organizationRows,
    widgetRows,
    existingTargets,
  ] = await Promise.all([
    db
      .select({
        id: form.id,
        name: form.name,
        locationId: form.locationId,
        updatedAt: form.updatedAt,
      })
      .from(form)
      .where(
        and(
          eq(form.organizationId, scope.organizationId),
          exactLocation
            ? eq(form.locationId, exactLocation)
            : isNull(form.locationId),
          ne(form.status, "ARCHIVED"),
        ),
      )
      .orderBy(asc(form.name), asc(form.id))
      .limit(INVENTORY_LIMIT_PER_KIND),
    db
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
          eq(pricingOption.organizationId, scope.organizationId),
          exactLocation
            ? eq(pricingOption.locationId, exactLocation)
            : isNull(pricingOption.locationId),
        ),
      )
      .orderBy(asc(pricingOption.name), asc(pricingOption.id))
      .limit(INVENTORY_LIMIT_PER_KIND),
    exactLocation
      ? db
          .select({
            id: location.id,
            name: location.companyName,
            updatedAt: location.updatedAt,
          })
          .from(location)
          .where(
            and(
              eq(location.organizationId, scope.organizationId),
              eq(location.id, exactLocation),
              eq(location.isActive, true),
            ),
          )
          .orderBy(asc(location.companyName), asc(location.id))
          .limit(INVENTORY_LIMIT_PER_KIND)
      : Promise.resolve([]),
    db
      .select({ id: organization.id, name: organization.name })
      .from(organization)
      .where(eq(organization.id, scope.organizationId))
      .limit(1),
    db
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
          eq(widgetConfig.organizationId, scope.organizationId),
          exactLocation
            ? eq(widgetConfig.locationId, exactLocation)
            : isNull(widgetConfig.locationId),
        ),
      )
      .orderBy(asc(widgetConfig.name), asc(widgetConfig.id))
      .limit(INVENTORY_LIMIT_PER_KIND),
    db
      .select({
        id: publicationTarget.id,
        kind: publicationTarget.kind,
        sourceKey: publicationTarget.sourceKey,
      })
      .from(publicationTarget)
      .where(
        and(
          eq(publicationTarget.organizationId, scope.organizationId),
          exactLocation
            ? eq(publicationTarget.locationId, exactLocation)
            : isNull(publicationTarget.locationId),
          ne(publicationTarget.status, "ARCHIVED"),
        ),
      ),
  ]);

  const targetBySource = new Map(
    existingTargets.map((target) => [
      `${target.kind}:${target.sourceKey}`,
      target.id,
    ]),
  );
  const targetId = (kind: PublicationKind, sourceKey: string): string | null =>
    targetBySource.get(`${kind}:${sourceKey}`) ?? null;
  const sources: PublicationSource[] = [];

  for (const row of formRows) {
    const sourceKey = `form:${row.id}`;
    sources.push(
      source({
        kind: "FORM",
        sourceKey,
        sourceId: row.id,
        name: row.name,
        locationId: row.locationId,
        updatedAt: row.updatedAt,
        targetId: targetId("FORM", sourceKey),
      }),
    );
  }
  for (const row of pricingRows) {
    const sourceKey = `pricing:${row.id}`;
    const available = row.isActive && row.isPublic && !row.isHidden;
    sources.push(
      source({
        kind: "PRICING",
        sourceKey,
        sourceId: row.id,
        name: row.name,
        locationId: row.locationId,
        updatedAt: row.updatedAt,
        targetId: targetId("PRICING", sourceKey),
        available,
        unavailableReason: available
          ? null
          : "Make this pricing option active, public, and visible before publishing.",
      }),
    );
  }
  for (const row of locationRows) {
    const sourceKey = `schedule:location:${row.id}`;
    sources.push(
      source({
        kind: "SCHEDULE",
        sourceKey,
        sourceId: row.id,
        name: `${row.name} schedule`,
        locationId: row.id,
        updatedAt: row.updatedAt,
        targetId: targetId("SCHEDULE", sourceKey),
      }),
    );
  }

  const org = organizationRows[0];
  if (!exactLocation && org) {
    const scheduleKey = `schedule:organization:${org.id}`;
    const giftCardKey = `gift-cards:${org.id}`;
    sources.push(
      source({
        kind: "SCHEDULE",
        sourceKey: scheduleKey,
        sourceId: org.id,
        name: `${org.name} schedule`,
        locationId: null,
        updatedAt: null,
        targetId: targetId("SCHEDULE", scheduleKey),
      }),
      source({
        kind: "GIFT_CARDS",
        sourceKey: giftCardKey,
        sourceId: org.id,
        name: `${org.name} gift cards`,
        locationId: null,
        updatedAt: null,
        targetId: targetId("GIFT_CARDS", giftCardKey),
      }),
    );
  }
  for (const row of widgetRows) {
    const sourceKey = row.locationId
      ? `widget:${row.id}:location:${row.locationId}`
      : `widget:${row.id}:organization`;
    sources.push(
      source({
        kind: "WIDGET",
        sourceKey,
        sourceId: row.id,
        name: row.name,
        locationId: row.locationId,
        updatedAt: row.updatedAt,
        targetId: targetId("WIDGET", sourceKey),
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
      }),
    );
  }
  return sources;
}
