import type { AnalyticsFixtures, GrowthBuildScope, GrowthPackFixtures } from "./types";
import { before } from "./shared";

export function buildAnalyticsFixtures(
  scope: GrowthBuildScope,
  internalFunnelId: string,
): AnalyticsFixtures {
  const { context, id, metadata } = scope;
  const { organizationId, locationId, referenceDate, runId } = context;
const profileCount = context.profile === "QA_EXHAUSTIVE" ? 180 : 100;
const sessionCount = context.profile === "QA_EXHAUSTIVE" ? 1_200 : 600;
const profiles: GrowthPackFixtures["profiles"] = Array.from(
  { length: profileCount },
  (_, index) => {
    const firstSeen = before(referenceDate, 180 - (index % 170));
    return {
      id: id("anonymous-profile", index),
      organizationId,
      locationId,
      anonymousId: `demo-anonymous-${runId}-${index}`,
      displayName: `Anonymous visitor ${String(index + 1).padStart(3, "0")}`,
      firstSeen,
      lastSeen: before(referenceDate, index % 30),
      totalSessions: Math.ceil(sessionCount / profileCount),
      totalEvents: Math.ceil(sessionCount / profileCount) * 5,
      avgEngagementRate: 0.42 + (index % 8) * 0.05,
      avgExperienceScore: 62 + (index % 35),
      lifecycleStage: index % 5 === 0 ? "lead" : "visitor",
      tags: index % 4 === 0 ? ["high-intent"] : [],
      userProperties: metadata({ cohort: index % 3 }),
      consentGiven: index % 4 !== 0,
      consentTimestamp: index % 4 !== 0 ? firstSeen : null,
      consentVersion: "1.0",
      dataRetentionDays: 365,
    };
  },
);
const channelDefinitions = [
  { source: "google", medium: "cpc", campaign: "studio-reset-search", platform: "google", click: "gclid" },
  { source: "facebook", medium: "paid_social", campaign: "mobility-intro", platform: "facebook", click: "fbclid" },
  { source: "tiktok", medium: "paid_social", campaign: "movement-reset", platform: "tiktok", click: "ttclid" },
  { source: "instagram", medium: "organic", campaign: "studio-stories", platform: "instagram", click: null },
  { source: "newsletter", medium: "email", campaign: "weekly-rhythm", platform: "email", click: null },
  { source: "direct", medium: "none", campaign: "direct", platform: "direct", click: null },
] as const;
const sessions: GrowthPackFixtures["sessions"] = [];
const events: GrowthPackFixtures["events"] = [];
const vitals: GrowthPackFixtures["vitals"] = [];
for (let index = 0; index < sessionCount; index += 1) {
  const profile = profiles[index % profiles.length];
  if (!profile) throw new Error("An analytics profile was not available.");
  const channel = channelDefinitions[index % channelDefinitions.length] ?? channelDefinitions[0];
  const converted = index % 9 === 0;
  const abandoned = !converted && index % 7 === 0;
  const startedAt = before(referenceDate, index % 180, index % 20);
  const sessionId = `demo-session-${runId}-${index}`;
  const clickId = `demo-click-${runId}-${index}`;
  const eventNames = converted
    ? ["page_view", "cta_click", "page_view", "form_start", "purchase"]
    : abandoned
      ? ["page_view", "cta_click", "page_view", "checkout_start", "checkout_abandon"]
      : ["page_view", "cta_click", "page_view", "form_start"];
  const stageNames = converted
    ? ["awareness", "interest", "desire", "checkout", "purchase"]
    : abandoned
      ? ["awareness", "interest", "desire", "checkout", "abandoned"]
      : ["awareness", "interest", "desire", "checkout"];
  const conversionValue = converted ? 49 + (index % 4) * 25 : 0;
  sessions.push({
    id: id("funnel-session", index),
    sessionId,
    funnelId: internalFunnelId,
    locationId,
    anonymousId: profile.anonymousId,
    profileId: profile.id,
    startedAt,
    endedAt: new Date(startedAt.getTime() + eventNames.length * 75_000),
    durationSeconds: eventNames.length * 75,
    firstSource: channel.source,
    firstMedium: channel.medium,
    firstCampaign: channel.campaign,
    firstPageUrl: "https://demo.invalid/p/studio-reset/start",
    lastSource: channel.source,
    lastMedium: channel.medium,
    lastCampaign: channel.campaign,
    lastPageUrl: converted ? "https://demo.invalid/p/studio-reset/thank-you" : "https://demo.invalid/p/studio-reset/plan",
    pageViews: 2,
    eventsCount: eventNames.length,
    converted,
    conversionValue: converted ? conversionValue.toFixed(2) : null,
    conversionType: converted ? "intro_offer" : null,
    deviceType: index % 5 === 0 ? "tablet" : index % 2 === 0 ? "mobile" : "desktop",
    browserName: index % 3 === 0 ? "Safari" : "Chrome",
    browserVersion: "demo",
    osName: index % 2 === 0 ? "iOS" : "macOS",
    osVersion: "demo",
    countryCode: index % 8 === 0 ? "US" : "GB",
    countryName: index % 8 === 0 ? "United States" : "United Kingdom",
    region: index % 8 === 0 ? "New York" : "England",
    city: index % 8 === 0 ? "New York" : index % 3 === 0 ? "Manchester" : "London",
    activeTimeSeconds: eventNames.length * 55,
    idleTimeSeconds: eventNames.length * 20,
    engagementRate: 0.45 + (index % 10) * 0.045,
    experienceScore: 65 + (index % 30),
    avgCls: 0.05 + (index % 4) * 0.02,
    avgFcp: 900 + (index % 8) * 90,
    avgInp: 120 + (index % 5) * 30,
    avgLcp: 1_600 + (index % 8) * 180,
    avgTtfb: 350 + (index % 6) * 55,
    currentStage: converted ? "purchase" : abandoned ? "abandoned" : "checkout",
    stageHistory: stageNames.map((stage, stageIndex) => ({ stage, at: new Date(startedAt.getTime() + stageIndex * 75_000).toISOString() })),
    touchpoints: [`${channel.source}/${channel.medium}`],
    consentGiven: profile.consentGiven ?? false,
    consentTimestamp: profile.consentTimestamp,
    consentVersion: "1.0",
    conversionPlatform: converted ? channel.platform : null,
    checkoutStartedAt: new Date(startedAt.getTime() + 3 * 75_000),
    checkoutCompletedAt: converted ? new Date(startedAt.getTime() + 4 * 75_000) : null,
    checkoutDuration: converted ? 75 : null,
    isAbandoned: abandoned,
    abandonedAt: abandoned ? new Date(startedAt.getTime() + 4 * 75_000) : null,
    abandonReason: abandoned ? "comparison" : null,
    firstGclid: channel.click === "gclid" ? clickId : null,
    lastGclid: channel.click === "gclid" ? clickId : null,
    firstFbclid: channel.click === "fbclid" ? clickId : null,
    lastFbclid: channel.click === "fbclid" ? clickId : null,
    firstTtclid: channel.click === "ttclid" ? clickId : null,
    lastTtclid: channel.click === "ttclid" ? clickId : null,
    firstTouchSource: channel.source,
    lastTouchSource: channel.source,
    createdAt: startedAt,
    updatedAt: new Date(startedAt.getTime() + eventNames.length * 75_000),
  });
  for (const [eventIndex, eventName] of eventNames.entries()) {
    const eventAt = new Date(startedAt.getTime() + eventIndex * 75_000);
    const conversionEvent = eventName === "purchase";
    const stage = stageNames[eventIndex] ?? "awareness";
    events.push({
      id: id(`funnel-session-${index}-event`, eventIndex),
      eventId: `demo-event-${runId}-${index}-${eventIndex}`,
      funnelId: internalFunnelId,
      locationId,
      eventName,
      eventProperties: metadata({ sessionIndex: index }),
      sessionId,
      anonymousId: profile.anonymousId,
      pageUrl: eventIndex < 2 ? "https://demo.invalid/p/studio-reset/start" : "https://demo.invalid/p/studio-reset/plan",
      pagePath: eventIndex < 2 ? "/p/studio-reset/start" : "/p/studio-reset/plan",
      pageTitle: eventIndex < 2 ? "Start" : "Your plan",
      utmSource: channel.source === "direct" ? null : channel.source,
      utmMedium: channel.medium === "none" ? null : channel.medium,
      utmCampaign: channel.campaign === "direct" ? null : channel.campaign,
      deviceType: index % 5 === 0 ? "tablet" : index % 2 === 0 ? "mobile" : "desktop",
      browserName: index % 3 === 0 ? "Safari" : "Chrome",
      countryCode: index % 8 === 0 ? "US" : "GB",
      countryName: index % 8 === 0 ? "United States" : "United Kingdom",
      region: index % 8 === 0 ? "New York" : "England",
      city: index % 8 === 0 ? "New York" : "London",
      timezone: context.timezone,
      isConversion: conversionEvent,
      conversionType: conversionEvent ? "intro_offer" : null,
      revenue: conversionEvent ? conversionValue.toFixed(2) : null,
      currency: conversionEvent ? context.currency : null,
      orderId: conversionEvent ? `demo-order-${runId}-${index}` : null,
      timestamp: eventAt,
      serverTimestamp: eventAt,
      createdAt: eventAt,
      funnelStage: stage,
      isMicroConversion: ["cta_click", "form_start", "checkout_start"].includes(eventName),
      microConversionType: ["cta_click", "form_start", "checkout_start"].includes(eventName) ? eventName : null,
      eventCategory: eventName === "page_view" ? "navigation" : conversionEvent ? "commerce" : "engagement",
      eventDescription: `Demo ${eventName.replaceAll("_", " ")}`,
      eventSource: "demo-seed",
      firstTouchUtmSource: channel.source,
      firstTouchUtmMedium: channel.medium,
      firstTouchUtmCampaign: channel.campaign,
      lastTouchUtmSource: channel.source,
      lastTouchUtmMedium: channel.medium,
      lastTouchUtmCampaign: channel.campaign,
      gclid: channel.click === "gclid" ? clickId : null,
      fbclid: channel.click === "fbclid" ? clickId : null,
      ttclid: channel.click === "ttclid" ? clickId : null,
    });
  }
  const vitalMetrics = ["LCP", "INP", "CLS", "FCP", "TTFB"] as const;
  for (const [vitalIndex, metric] of vitalMetrics.entries()) {
    if (index % 3 === 2 && vitalIndex > 1) continue;
    const baseValue = metric === "CLS" ? 0.05 : metric === "INP" ? 140 : metric === "LCP" ? 1_800 : metric === "FCP" ? 1_050 : 420;
    const value = baseValue + (index % 8) * (metric === "CLS" ? 0.01 : 35);
    const rating = metric === "CLS" ? (value <= 0.1 ? "GOOD" : "NEEDS_IMPROVEMENT") : metric === "INP" ? (value <= 200 ? "GOOD" : "NEEDS_IMPROVEMENT") : value <= 2_500 ? "GOOD" : "NEEDS_IMPROVEMENT";
    vitals.push({
      id: id(`funnel-session-${index}-vital`, vitalIndex),
      funnelId: internalFunnelId,
      locationId,
      sessionId,
      anonymousId: profile.anonymousId,
      pageUrl: "https://demo.invalid/p/studio-reset/start",
      pagePath: "/p/studio-reset/start",
      pageTitle: "Start",
      metric,
      value,
      rating,
      deviceType: index % 2 === 0 ? "mobile" : "desktop",
      browserName: index % 3 === 0 ? "Safari" : "Chrome",
      countryCode: index % 8 === 0 ? "US" : "GB",
      countryName: index % 8 === 0 ? "United States" : "United Kingdom",
      timestamp: new Date(startedAt.getTime() + vitalIndex * 1_000),
    });
  }
}

const adSpendRows: GrowthPackFixtures["adSpendRows"] = [];
const adPlatforms = ["google", "facebook", "tiktok"] as const;
const historyDays = context.profileConfig.historyMonths * 30;
for (let day = 0; day < historyDays; day += 1) {
  for (const [platformIndex, platform] of adPlatforms.entries()) {
    const impressions = 2_000 + ((day * 97 + platformIndex * 311) % 8_000);
    const clicks = Math.max(20, Math.round(impressions * (0.025 + platformIndex * 0.006)));
    const conversions = Math.max(1, Math.round(clicks * (0.035 + (day % 5) * 0.005)));
    const spend = clicks * (0.72 + platformIndex * 0.21);
    const revenue = conversions * (74 + platformIndex * 12);
    const date = before(referenceDate, day).toISOString().slice(0, 10);
    adSpendRows.push({
      id: id("ad-spend", `${day}-${platform}`),
      organizationId,
      locationId,
      funnelId: internalFunnelId,
      platform,
      campaignId: `demo-${locationId.slice(0, 8)}-${runId.slice(0, 8)}-${platform}`,
      campaignName: platform === "google" ? "Studio reset search" : platform === "facebook" ? "Mobility intro" : "Movement reset",
      adSetId: `demo-${platform}-prospects`,
      adSetName: "Wellness prospects",
      date,
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


  return { profiles, sessions, events, vitals, adSpendRows };
}
