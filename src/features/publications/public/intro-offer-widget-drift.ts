import "server-only";

import type { PublishedIntroOfferWidgetSource } from "@/features/publications/public/contracts";
import { selectPublicIntroOffers } from "@/features/publications/server/widget-source-data";

export async function introOfferWidgetSourceIsCurrent(input: {
  organizationId: string;
  locationId: string | null;
  source: PublishedIntroOfferWidgetSource;
}): Promise<boolean> {
  const rows = await selectPublicIntroOffers({
    ids: input.source.widget.config.pricingOptionIds,
    scope: {
      organizationId: input.organizationId,
      locationId: input.locationId,
    },
  });
  if (rows.length !== input.source.offers.length) return false;
  const liveById = new Map(rows.map((row) => [row.id, row]));
  return input.source.offers.every((offer) => {
    const live = liveById.get(offer.id);
    return (
      live?.updatedAt.toISOString() === offer.updatedAt &&
      live.targetId === offer.pricingTarget.id &&
      live.targetSlug === offer.pricingTarget.slug &&
      live.targetVersionId === offer.pricingTarget.versionId
    );
  });
}
