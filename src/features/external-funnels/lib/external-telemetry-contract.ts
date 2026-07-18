import { z } from "zod";

export const MAX_EXTERNAL_TELEMETRY_BODY_BYTES = 64 * 1_024;
export const MAX_EXTERNAL_TELEMETRY_EVENT_AGE_MS = 24 * 60 * 60 * 1_000;
export const MAX_EXTERNAL_TELEMETRY_FUTURE_MS = 5 * 60 * 1_000;

const shortText = z.string().max(256);
const mediumText = z.string().max(1_024);
const pageText = z.string().max(2_048);
const propertyBag = z.record(z.string().min(1).max(100), z.unknown());

const utmSchema = z.object({
  source: shortText.optional(),
  medium: shortText.optional(),
  campaign: shortText.optional(),
  term: shortText.optional(),
  content: shortText.optional(),
});

const persistedUtmSchema = utmSchema.extend({
  timestamp: z.number().int().nonnegative().optional(),
});

export const externalTelemetryEventSchema = z.object({
  eventId: z.string().min(1).max(256),
  eventName: z.string().trim().min(1).max(100),
  properties: propertyBag.optional(),
  context: z.object({
    page: z
      .object({
        url: pageText,
        path: pageText,
        title: z.string().max(500).optional(),
        referrer: pageText.optional(),
      })
      .optional(),
    utm: utmSchema.optional(),
    firstTouchUtm: persistedUtmSchema.optional(),
    lastTouchUtm: persistedUtmSchema.optional(),
    clickIds: z
      .object({
        fbclid: mediumText.optional(),
        fbadid: mediumText.optional(),
        gclid: mediumText.optional(),
        gbraid: mediumText.optional(),
        wbraid: mediumText.optional(),
        dclid: mediumText.optional(),
        ttclid: mediumText.optional(),
        tt_content: mediumText.optional(),
        msclkid: mediumText.optional(),
        twclid: mediumText.optional(),
        li_fat_id: mediumText.optional(),
        ScCid: mediumText.optional(),
        epik: mediumText.optional(),
        rdt_cid: mediumText.optional(),
      })
      .optional(),
    cookies: z
      .object({
        fbp: mediumText.optional(),
        fbc: mediumText.optional(),
        ttp: mediumText.optional(),
      })
      .optional(),
    gdpr: z
      .object({
        consentGiven: z.boolean().optional(),
        consentVersion: shortText.optional(),
        consentTimestamp: shortText.optional(),
      })
      .optional(),
    user: z
      .object({
        userId: shortText.optional(),
        anonymousId: shortText.optional(),
      })
      .optional(),
    session: z.object({ sessionId: z.string().min(1).max(256) }),
    device: z
      .object({
        userAgent: mediumText.optional(),
        screenWidth: z.number().int().min(0).max(100_000).optional(),
        screenHeight: z.number().int().min(0).max(100_000).optional(),
        language: shortText.optional(),
        timezone: shortText.optional(),
        deviceType: shortText.optional(),
        browserName: shortText.optional(),
        browserVersion: shortText.optional(),
        osName: shortText.optional(),
        osVersion: shortText.optional(),
      })
      .optional(),
    customDimensions: propertyBag.optional(),
    abTests: z
      .array(
        z.object({
          testId: z.string().min(1).max(128),
          variant: z.string().min(1).max(128),
        }),
      )
      .max(50)
      .optional(),
    leadScore: z
      .object({ score: z.number().finite(), grade: shortText })
      .optional(),
    engagement: z
      .object({ score: z.number().finite(), level: shortText })
      .optional(),
  }),
  timestamp: z.number().int().nonnegative(),
});

export const externalTelemetryBatchSchema = z.object({
  events: z.array(externalTelemetryEventSchema).min(1).max(10),
  batch: z.boolean().optional(),
});

export const externalWebVitalSchema = z.object({
  funnelId: z.string().min(1).max(128),
  sessionId: z.string().min(1).max(256),
  anonymousId: shortText.optional(),
  pageUrl: pageText,
  pagePath: pageText,
  pageTitle: z.string().max(500).optional(),
  metric: z.enum(["LCP", "INP", "CLS", "FCP", "TTFB", "FID"]),
  value: z.number().finite().min(0).max(10_000_000),
  rating: z.enum(["GOOD", "NEEDS_IMPROVEMENT", "POOR"]),
  delta: z.number().finite().min(-10_000_000).max(10_000_000).optional(),
  id_metric: shortText.optional(),
  deviceType: shortText.optional(),
  browserName: shortText.optional(),
  browserVersion: shortText.optional(),
  osName: shortText.optional(),
  osVersion: shortText.optional(),
  screenWidth: z.number().int().min(0).max(100_000).optional(),
  screenHeight: z.number().int().min(0).max(100_000).optional(),
  timestamp: z.string().datetime(),
});

export function externalTelemetryTimesAreCurrent(
  timestamps: readonly number[],
  now = Date.now(),
): boolean {
  return timestamps.every(
    (timestamp) =>
      timestamp >= now - MAX_EXTERNAL_TELEMETRY_EVENT_AGE_MS &&
      timestamp <= now + MAX_EXTERNAL_TELEMETRY_FUTURE_MS,
  );
}
