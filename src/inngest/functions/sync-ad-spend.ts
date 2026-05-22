/**
 * Ad Spend Sync Inngest Function
 * 
 * Syncs daily ad spend from Meta, Google Ads, and TikTok
 * Scheduled to run daily at 2 AM to import previous day's spend
 */

import { inngest } from "../client";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adPlatformCredential, adSpend } from "@/db/schema";

type AdCampaignSpend = {
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
};

type ActionMetric = {
  action_type?: string;
  value?: string;
};

type MetaInsightRow = {
  campaign_id?: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: ActionMetric[];
  action_values?: ActionMetric[];
};

type GoogleAdsRow = {
  campaign?: { id?: string; name?: string };
  metrics?: {
    costMicros?: string;
    impressions?: string;
    clicks?: string;
    conversions?: string;
    conversionsValue?: string;
  };
};

type GoogleAdsBatch = { results?: GoogleAdsRow[] };

type TikTokReportRow = {
  dimensions?: { campaign_id?: string; campaign_name?: string };
  metrics?: {
    spend?: string;
    impressions?: string;
    clicks?: string;
    complete_payment?: string;
    complete_payment_value?: string;
  };
};

/**
 * Meta Marketing API - Fetch ad spend
 * Docs: https://developers.facebook.com/docs/marketing-api/insights
 */
async function fetchMetaAdSpend(config: {
  accessToken: string;
  adAccountId: string;
  date: string; // Format: YYYY-MM-DD
}): Promise<AdCampaignSpend[]> {
  const { accessToken, adAccountId, date } = config;

  const fields = [
    'campaign_id',
    'campaign_name',
    'spend',
    'impressions',
    'clicks',
    'actions', // Contains conversions
    'action_values', // Contains revenue
  ].join(',');

  const params = new URLSearchParams({
    access_token: accessToken,
    fields,
    time_range: JSON.stringify({
      since: date,
      until: date,
    }),
    level: 'campaign',
    breakdowns: 'campaign_id',
  });

  const url = `https://graph.facebook.com/v18.0/act_${adAccountId}/insights?${params}`;

  const response = await fetch(url);
  const result = (await response.json()) as { error?: { message?: string }; data?: MetaInsightRow[] };

  if (!response.ok) {
    throw new Error(`Meta API error: ${result.error?.message || 'Unknown error'}`);
  }

  return (result.data || []).map((row) => {
    const conversions = row.actions?.find((action) => action.action_type === 'purchase')?.value || "0";
    const revenue = row.action_values?.find((action) => action.action_type === 'purchase')?.value || "0";

    return {
      campaignId: row.campaign_id ?? "",
      campaignName: row.campaign_name ?? row.campaign_id ?? "Unknown",
      spend: parseFloat(row.spend || "0"),
      impressions: parseInt(row.impressions || "0"),
      clicks: parseInt(row.clicks || "0"),
      conversions: parseInt(conversions),
      revenue: parseFloat(revenue),
    };
  });
}

/**
 * Google Ads API - Fetch ad spend
 * Docs: https://developers.google.com/google-ads/api/docs/reporting/overview
 */
async function fetchGoogleAdSpend(config: {
  customerId: string;
  developerToken: string;
  accessToken: string;
  loginCustomerId?: string;
  date: string; // Format: YYYY-MM-DD
}): Promise<AdCampaignSpend[]> {
  const { customerId, developerToken, accessToken, loginCustomerId, date } = config;

  // GAQL query for campaign performance
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date = '${date}'
  `;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': developerToken,
  };

  if (loginCustomerId) {
    headers['login-customer-id'] = loginCustomerId;
  }

  const url = `https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:searchStream`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  });

  const result = (await response.json()) as GoogleAdsBatch[] & { error?: { message?: string } };

  if (!response.ok) {
    throw new Error(`Google Ads API error: ${result.error?.message || 'Unknown error'}`);
  }

  const campaigns: AdCampaignSpend[] = [];
  for (const batch of result) {
    for (const row of batch.results || []) {
      campaigns.push({
        campaignId: row.campaign?.id ?? "",
        campaignName: row.campaign?.name ?? row.campaign?.id ?? "Unknown",
        spend: parseFloat(row.metrics?.costMicros || "0") / 1000000,
        impressions: parseInt(row.metrics?.impressions || "0"),
        clicks: parseInt(row.metrics?.clicks || "0"),
        conversions: parseFloat(row.metrics?.conversions || "0"),
        revenue: parseFloat(row.metrics?.conversionsValue || "0"),
      });
    }
  }

  return campaigns;
}

/**
 * TikTok Ads API - Fetch ad spend
 * Docs: https://business-api.tiktok.com/portal/docs?id=1771101264488450
 */
async function fetchTikTokAdSpend(config: {
  accessToken: string;
  advertiserId: string;
  date: string; // Format: YYYY-MM-DD
}): Promise<AdCampaignSpend[]> {
  const { accessToken, advertiserId, date } = config;

  const body = {
    advertiser_id: advertiserId,
    service_type: 'AUCTION',
    report_type: 'BASIC',
    data_level: 'AUCTION_CAMPAIGN',
    dimensions: ['campaign_id'],
    metrics: [
      'spend',
      'impressions',
      'clicks',
      'complete_payment',
      'complete_payment_value',
    ],
    start_date: date,
    end_date: date,
  };

  const url = 'https://business-api.tiktok.com/open_api/v1.3/reports/integrated/get/';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Access-Token': accessToken,
    },
    body: JSON.stringify(body),
  });

  const result = (await response.json()) as { code?: number; message?: string; data?: { list?: TikTokReportRow[] } };

  if (result.code !== 0) {
    throw new Error(`TikTok API error: ${result.message || 'Unknown error'}`);
  }

  return (result.data?.list || []).map((row) => ({
    campaignId: row.dimensions?.campaign_id ?? "",
    campaignName: row.dimensions?.campaign_name || row.dimensions?.campaign_id || "Unknown",
    spend: parseFloat(row.metrics?.spend || "0"),
    impressions: parseInt(row.metrics?.impressions || "0"),
    clicks: parseInt(row.metrics?.clicks || "0"),
    conversions: parseInt(row.metrics?.complete_payment || "0"),
    revenue: parseFloat(row.metrics?.complete_payment_value || "0"),
  }));
}

/**
 * Calculate derived metrics
 */
function calculateMetrics(data: {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}) {
  const { spend, impressions, clicks, conversions, revenue } = data;

  return {
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
    roas: spend > 0 ? (revenue / spend) * 100 : 0,
  };
}

/**
 * Sync ad spend from all platforms
 */
export const syncAdSpend = inngest.createFunction(
  {
    id: "sync-ad-spend",
    name: "Sync Ad Spend from Ad Platforms",
  },
  { cron: "0 2 * * *" }, // Run daily at 2 AM UTC
  async ({ step }) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    console.log(`[Ad Spend Sync] Starting sync for date: ${dateStr}`);

    // Get all active ad platform credentials
    const credentials = await db.query.adPlatformCredential.findMany({
      where: eq(adPlatformCredential.isActive, true),
      with: {
        organization: true,
        location: true,
      },
    });

    console.log(`[Ad Spend Sync] Found ${credentials.length} active credentials`);

    for (const credential of credentials) {
      await step.run(`sync-${credential.platform}-${credential.id}`, async () => {
        try {
          let campaigns: AdCampaignSpend[] = [];

          // Fetch spend based on platform
          if (credential.platform === 'facebook' && credential.accessToken && credential.accountId) {
            campaigns = await fetchMetaAdSpend({
              accessToken: credential.accessToken,
              adAccountId: credential.accountId,
              date: dateStr,
            });
          } else if (credential.platform === 'google' && credential.accessToken && credential.accountId) {
            const googleDevToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
            if (!googleDevToken) {
              throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN not set');
            }

            campaigns = await fetchGoogleAdSpend({
              customerId: credential.accountId,
              developerToken: googleDevToken,
              accessToken: credential.accessToken,
              date: dateStr,
            });
          } else if (credential.platform === 'tiktok' && credential.accessToken && credential.accountId) {
            campaigns = await fetchTikTokAdSpend({
              accessToken: credential.accessToken,
              advertiserId: credential.accountId,
              date: dateStr,
            });
          }

          // Save to database
          for (const campaign of campaigns) {
            const metrics = calculateMetrics(campaign);

            await db
              .insert(adSpend)
              .values({
                id: createId(),
                platform: credential.platform,
                campaignId: campaign.campaignId,
                campaignName: campaign.campaignName,
                date: dateStr,
                spend: String(campaign.spend),
                currency: 'USD',
                impressions: campaign.impressions,
                clicks: campaign.clicks,
                conversions: campaign.conversions,
                revenue: String(campaign.revenue),
                cpc: String(metrics.cpc),
                cpm: String(metrics.cpm),
                ctr: String(metrics.ctr),
                conversionRate: String(metrics.conversionRate),
                roas: String(metrics.roas),
                organizationId: credential.organizationId,
                locationId: credential.locationId,
                updatedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: [adSpend.organizationId, adSpend.platform, adSpend.campaignId, adSpend.date],
                set: {
                  campaignName: campaign.campaignName,
                  spend: String(campaign.spend),
                  impressions: campaign.impressions,
                  clicks: campaign.clicks,
                  conversions: campaign.conversions,
                  revenue: String(campaign.revenue),
                  cpc: String(metrics.cpc),
                  cpm: String(metrics.cpm),
                  ctr: String(metrics.ctr),
                  conversionRate: String(metrics.conversionRate),
                  roas: String(metrics.roas),
                  updatedAt: new Date(),
                },
              });
          }

          console.log(`[Ad Spend Sync] Synced ${campaigns.length} campaigns for ${credential.platform}`);
        } catch (error) {
          console.error(`[Ad Spend Sync] Error syncing ${credential.platform}:`, error);
          // Continue with next credential
        }
      });
    }

    console.log(`[Ad Spend Sync] Completed sync for date: ${dateStr}`);
  }
);
