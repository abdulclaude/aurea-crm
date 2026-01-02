/**
 * ROAS (Return on Ad Spend) Calculation Utilities
 * 
 * Provides functions to calculate key advertising metrics:
 * - ROAS: (Revenue / Ad Spend) * 100
 * - CPA: Cost Per Acquisition = Ad Spend / Conversions
 * - CPC: Cost Per Click = Ad Spend / Clicks
 * - CPM: Cost Per Mille (1000 impressions) = (Ad Spend / Impressions) * 1000
 * - CTR: Click-Through Rate = (Clicks / Impressions) * 100
 * - Conversion Rate: (Conversions / Clicks) * 100
 */

export interface AdMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

export interface CalculatedMetrics {
  roas: number;       // Return on Ad Spend (percentage)
  cpa: number;        // Cost Per Acquisition
  cpc: number;        // Cost Per Click
  cpm: number;        // Cost Per 1000 Impressions
  ctr: number;        // Click-Through Rate (percentage)
  conversionRate: number;  // Conversion Rate (percentage)
  profit: number;     // Revenue - Spend
  profitMargin: number;    // (Profit / Revenue) * 100
}

/**
 * Calculate all advertising metrics from raw data
 */
export function calculateAdMetrics(data: AdMetrics): CalculatedMetrics {
  const { spend, impressions, clicks, conversions, revenue } = data;

  // ROAS: Return on Ad Spend
  const roas = spend > 0 ? (revenue / spend) * 100 : 0;

  // CPA: Cost Per Acquisition
  const cpa = conversions > 0 ? spend / conversions : 0;

  // CPC: Cost Per Click
  const cpc = clicks > 0 ? spend / clicks : 0;

  // CPM: Cost Per 1000 Impressions
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;

  // CTR: Click-Through Rate
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  // Conversion Rate
  const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

  // Profit
  const profit = revenue - spend;

  // Profit Margin
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    roas,
    cpa,
    cpc,
    cpm,
    ctr,
    conversionRate,
    profit,
    profitMargin,
  };
}

/**
 * Calculate ROAS for a single campaign
 */
export function calculateROAS(revenue: number, spend: number): number {
  return spend > 0 ? (revenue / spend) * 100 : 0;
}

/**
 * Calculate CPA (Cost Per Acquisition)
 */
export function calculateCPA(spend: number, conversions: number): number {
  return conversions > 0 ? spend / conversions : 0;
}

/**
 * Calculate CPC (Cost Per Click)
 */
export function calculateCPC(spend: number, clicks: number): number {
  return clicks > 0 ? spend / clicks : 0;
}

/**
 * Calculate CPM (Cost Per 1000 Impressions)
 */
export function calculateCPM(spend: number, impressions: number): number {
  return impressions > 0 ? (spend / impressions) * 1000 : 0;
}

/**
 * Calculate CTR (Click-Through Rate)
 */
export function calculateCTR(clicks: number, impressions: number): number {
  return impressions > 0 ? (clicks / impressions) * 100 : 0;
}

/**
 * Calculate Conversion Rate
 */
export function calculateConversionRate(conversions: number, clicks: number): number {
  return clicks > 0 ? (conversions / clicks) * 100 : 0;
}

/**
 * Aggregate metrics across multiple campaigns/platforms
 */
export function aggregateMetrics(campaigns: AdMetrics[]): AdMetrics & CalculatedMetrics {
  const totals = campaigns.reduce(
    (acc, campaign) => ({
      spend: acc.spend + campaign.spend,
      impressions: acc.impressions + campaign.impressions,
      clicks: acc.clicks + campaign.clicks,
      conversions: acc.conversions + campaign.conversions,
      revenue: acc.revenue + campaign.revenue,
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
  );

  const calculated = calculateAdMetrics(totals);

  return {
    ...totals,
    ...calculated,
  };
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format percentage value
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format number with commas
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Determine ROAS health status
 */
export function getROASStatus(roas: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (roas >= 400) return 'excellent';  // 4x return or better
  if (roas >= 200) return 'good';       // 2x return
  if (roas >= 100) return 'fair';       // Break-even or slightly profitable
  return 'poor';                        // Losing money
}

/**
 * Get ROAS color for UI (Tailwind classes)
 */
export function getROASColor(roas: number): string {
  const status = getROASStatus(roas);
  switch (status) {
    case 'excellent':
      return 'text-green-500';
    case 'good':
      return 'text-blue-500';
    case 'fair':
      return 'text-yellow-500';
    case 'poor':
      return 'text-red-500';
  }
}
