import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { pricingOption } from "@/db/schema";
import type { PublicationKind } from "@/features/publications/contracts";
import { canonicalPublicationValue } from "@/features/publications/lib/content-hash";
import {
  locationBranding,
  organizationBranding,
} from "@/features/publications/server/brand-snapshot";
import type { PublicationSourceScope } from "@/features/publications/server/source-types";
import { buildWidgetChannelSnapshot } from "@/features/publications/server/widget-channel-snapshot";

async function scheduleSnapshot(input: {
  sourceId: string;
  scope: PublicationSourceScope;
}): Promise<unknown> {
  if (input.sourceId === input.scope.organizationId) {
    return {
      type: "SCHEDULE",
      scope: "ORGANIZATION",
      organization: await organizationBranding(input.scope.organizationId),
    };
  }
  return {
    type: "SCHEDULE",
    scope: "LOCATION",
    location: await locationBranding(
      input.scope.organizationId,
      input.sourceId,
    ),
  };
}

async function pricingSnapshot(input: {
  sourceId: string;
  scope: PublicationSourceScope;
}): Promise<unknown> {
  const [row] = await db
    .select({
      id: pricingOption.id,
      name: pricingOption.name,
      slug: pricingOption.slug,
      description: pricingOption.description,
      type: pricingOption.type,
      price: pricingOption.price,
      currency: pricingOption.currency,
      billingInterval: pricingOption.billingInterval,
      classCredits: pricingOption.classCredits,
      durationDays: pricingOption.durationDays,
      isIntroOffer: pricingOption.isIntroOffer,
      isBundle: pricingOption.isBundle,
      isPublic: pricingOption.isPublic,
      isHidden: pricingOption.isHidden,
      directPurchaseEnabled: pricingOption.directPurchaseEnabled,
      buyPagePath: pricingOption.buyPagePath,
      termsText: pricingOption.termsText,
      accessSummary: pricingOption.accessSummary,
      locationId: pricingOption.locationId,
      updatedAt: pricingOption.updatedAt,
    })
    .from(pricingOption)
    .where(
      and(
        eq(pricingOption.id, input.sourceId),
        eq(pricingOption.organizationId, input.scope.organizationId),
      ),
    )
    .limit(1);
  return { type: "PRICING", pricingOption: row ?? null };
}

export async function buildChannelSourceSnapshot(input: {
  kind: Exclude<PublicationKind, "FORM">;
  sourceId: string;
  scope: PublicationSourceScope;
}): Promise<ReturnType<typeof canonicalPublicationValue>> {
  let snapshot: unknown;
  if (input.kind === "SCHEDULE") {
    snapshot = await scheduleSnapshot(input);
  } else if (input.kind === "PRICING") {
    snapshot = await pricingSnapshot(input);
  } else if (input.kind === "GIFT_CARDS") {
    snapshot = {
      type: "GIFT_CARDS",
      organization: await organizationBranding(input.scope.organizationId),
    };
  } else {
    snapshot = await buildWidgetChannelSnapshot(input);
  }
  return canonicalPublicationValue(snapshot);
}
