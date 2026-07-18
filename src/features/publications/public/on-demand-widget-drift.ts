import "server-only";

import type { PublishedOnDemandWidgetSource } from "@/features/publications/public/contracts";
import { selectPublicFreeOnDemandAssets } from "@/features/publications/server/widget-source-data";
import { toPublicOnDemandAsset } from "@/features/studio/widgets/on-demand-public-asset";

export async function onDemandWidgetSourceIsCurrent(input: {
  organizationId: string;
  locationId: string | null;
  source: PublishedOnDemandWidgetSource;
}): Promise<boolean> {
  const rows = await selectPublicFreeOnDemandAssets({
    ids: input.source.widget.config.assetIds,
    scope: {
      organizationId: input.organizationId,
      locationId: input.locationId,
    },
  });
  if (rows.length !== input.source.assets.length) return false;
  const liveById = new Map(
    rows.map((row) => [
      row.id,
      toPublicOnDemandAsset(row, input.source.widget.config),
    ]),
  );
  return input.source.assets.every((asset) => {
    const live = liveById.get(asset.id);
    return Boolean(live && JSON.stringify(live) === JSON.stringify(asset));
  });
}
