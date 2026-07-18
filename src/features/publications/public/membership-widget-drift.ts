import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import { pricingOption } from "@/db/schema";
import type { PublishedMembershipWidgetSource } from "@/features/publications/public/contracts";

export async function membershipWidgetSourceIsCurrent(input: {
  organizationId: string;
  locationId: string | null;
  source: PublishedMembershipWidgetSource;
}): Promise<boolean> {
  const ids = input.source.widget.config.pricingOptionIds;
  const rows = await db
    .select({ id: pricingOption.id, updatedAt: pricingOption.updatedAt })
    .from(pricingOption)
    .where(
      and(
        inArray(pricingOption.id, ids),
        eq(pricingOption.organizationId, input.organizationId),
        input.locationId
          ? eq(pricingOption.locationId, input.locationId)
          : isNull(pricingOption.locationId),
        eq(pricingOption.type, "MEMBERSHIP"),
        eq(pricingOption.isActive, true),
        eq(pricingOption.isPublic, true),
        eq(pricingOption.isHidden, false),
      ),
    );
  if (rows.length !== ids.length) return false;
  const currentById = new Map(
    rows.map((row) => [row.id, row.updatedAt.toISOString()]),
  );
  return input.source.offers.every(
    (offer) => currentById.get(offer.id) === offer.updatedAt,
  );
}
