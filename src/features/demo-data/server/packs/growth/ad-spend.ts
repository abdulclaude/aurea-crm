import { before } from "./shared";
import type { AdSpendFixtures, GrowthBuildScope } from "./types";

export function buildAdSpendFixtures(
  scope: GrowthBuildScope,
): AdSpendFixtures {
  const { context, id, metadata } = scope;
  const { organizationId, locationId, referenceDate, runId } = context;
  const platforms = ["google", "facebook", "tiktok"] as const;
  const rows: AdSpendFixtures["adSpendRows"] = [];
  const historyDays = context.profileConfig.historyMonths * 30;

  for (let day = 0; day < historyDays; day += 1) {
    for (const [platformIndex, platform] of platforms.entries()) {
      const impressions = 2_000 + ((day * 97 + platformIndex * 311) % 8_000);
      const clicks = Math.max(
        20,
        Math.round(impressions * (0.025 + platformIndex * 0.006)),
      );
      const conversions = Math.max(
        1,
        Math.round(clicks * (0.035 + (day % 5) * 0.005)),
      );
      const spend = clicks * (0.72 + platformIndex * 0.21);
      const revenue = conversions * (74 + platformIndex * 12);

      rows.push({
        id: id("ad-spend", `${day}-${platform}`),
        organizationId,
        locationId,
        platform,
        campaignId: `demo-${locationId.slice(0, 8)}-${runId.slice(0, 8)}-${platform}`,
        campaignName:
          platform === "google"
            ? "Studio search"
            : platform === "facebook"
              ? "Mobility intro"
              : "Movement reset",
        adSetId: `demo-${platform}-prospects`,
        adSetName: "Wellness prospects",
        date: before(referenceDate, day).toISOString().slice(0, 10),
        spend: spend.toFixed(2),
        currency: context.currency,
        impressions,
        clicks,
        conversions,
        revenue: revenue.toFixed(2),
        cpc: (spend / clicks).toFixed(2),
        cpm: ((spend / impressions) * 1_000).toFixed(2),
        ctr: ((clicks / impressions) * 100).toFixed(2),
        conversionRate: ((conversions / clicks) * 100).toFixed(2),
        roas: (revenue / spend).toFixed(2),
        rawData: metadata({ synthetic: true }),
        updatedAt: referenceDate,
      });
    }
  }

  return { adSpendRows: rows };
}
