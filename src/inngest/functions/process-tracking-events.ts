import { inngest } from "../client";
import { db } from "@/db";
import {
	and,
	eq,
	inArray,
	isNotNull,
	isNull,
	sql,
	type SQL,
} from "drizzle-orm";
import {
	anonymousUserProfiles,
	client,
	funnel,
	funnelEvent,
	funnelSession,
} from "@/db/schema";
import { sendWorkflowExecution } from "../utils";
import { generateUserName } from "@/features/external-funnels/lib/generate-user-name";
import {
	parseUserAgent as parseUA,
	parseIPAddress,
} from "@/lib/device-parser";
import { pushRealtimeEvents } from "@/lib/realtime-cache";
import { dispatchAdConversionEvent } from "@/features/ad-conversions/server/dispatch-conversion";
import { buildAnonymousProfileId } from "@/features/external-funnels/lib/anonymous-profile-identity";
import { z } from "zod";

type TrackingEventProperties = Record<string, unknown> & {
  _category?: string;
  _color?: string;
  _currentStage?: string;
  _description?: string;
  _value?: number;
  activeTime?: number;
  anonymousId?: string;
  checkoutDuration?: number;
  conversionType?: string;
  currency?: string;
  currentStage?: string;
  duration?: number;
  engagementRate?: number;
  idleTime?: number;
  metric?: string;
  microConversionType?: string;
  orderId?: string;
  originalSessionId?: string;
  rating?: string;
  reason?: string;
  revenue?: number;
  stage?: string;
  stageHistory?: unknown[];
  traits?: Record<string, unknown> & { name?: string; email?: string };
  userId?: string;
  value?: number;
};

interface TrackingEvent {
  eventId: string;
  eventName: string;
  properties?: TrackingEventProperties;
  context: {
    page?: {
      url: string;
      path: string;
      title?: string;
      referrer?: string;
    };
    utm?: {
      source?: string;
      medium?: string;
      campaign?: string;
      term?: string;
      content?: string;
    };
    firstTouchUtm?: {
      source?: string;
      medium?: string;
      campaign?: string;
      term?: string;
      content?: string;
      timestamp?: number;
    };
    lastTouchUtm?: {
      source?: string;
      medium?: string;
      campaign?: string;
      term?: string;
      content?: string;
      timestamp?: number;
    };
    clickIds?: {
      fbclid?: string;
      fbadid?: string;
      gclid?: string;
      gbraid?: string;
      wbraid?: string;
      dclid?: string;
      ttclid?: string;
      tt_content?: string;
      msclkid?: string;
      twclid?: string;
      li_fat_id?: string;
      ScCid?: string;
      epik?: string;
      rdt_cid?: string;
    };
    cookies?: {
      fbp?: string;
      fbc?: string;
      ttp?: string;
    };
    gdpr?: {
      consentGiven?: boolean;
      consentVersion?: string;
      consentTimestamp?: string;
    };
    user?: {
      userId?: string;
      anonymousId?: string;
    };
    session: {
      sessionId: string;
    };
    device?: {
      userAgent?: string;
      deviceType?: string;
      browserName?: string;
      browserVersion?: string;
      osName?: string;
      osVersion?: string;
      screenWidth?: number;
      screenHeight?: number;
      language?: string;
      timezone?: string;
    };
    customDimensions?: Record<string, unknown>;
    abTests?: Array<{
      testId: string;
      variant: string;
    }>;
    leadScore?: {
      score: number;
      grade: string;
    };
    engagement?: {
      score: number;
      level: string;
    };
  };
  timestamp: number;
}

// Parse user agent using ua-parser-js for better accuracy
function parseUserAgent(userAgent?: string, screenWidth?: number, screenHeight?: number) {
	if (!userAgent) {
		return {
			deviceType: "Unknown",
			browserName: "Unknown",
			browserVersion: "Unknown",
			osName: "Unknown",
			osVersion: "Unknown",
		};
	}

	return parseUA(userAgent, screenWidth, screenHeight);
}

type GeoCoordinates = { latitude: number; longitude: number } | null;

const normalizeCountryCode = (code?: string | null) => {
  if (!code) return undefined;
  const normalized = code.trim().toUpperCase();
  if (!normalized) return undefined;
  if (normalized === "UK") return "GB";
  return normalized;
};

const unknownRecordSchema = z.record(z.string(), z.unknown());

function asUnknownRecord(value: unknown): Record<string, unknown> {
  const parsed = unknownRecordSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

function stringProperty(
  value: Record<string, unknown>,
  key: string,
): string | undefined {
  const property = value[key];
  return typeof property === "string" && property.trim()
    ? property.trim()
    : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export const processTrackingEvents = inngest.createFunction(
  {
    id: "process-tracking-events",
    retries: 3,
  },
  { event: "tracking/events.batch" },
  async ({ event, step }) => {
    const { funnelId, locationId, organizationId, events, ipAddress, trustLevel } = event.data as {
      funnelId: string;
      locationId: string | null;
      organizationId: string;
      events: TrackingEvent[];
      ipAddress: string;
      trustLevel?: "TELEMETRY" | "VERIFIED_FORM";
    };

    const cityGeoCache = new Map<string, GeoCoordinates>();
    const authoritativeFunnel = await step.run("resolve-tracking-scope", async () => {
      const [record] = await db
        .select({
          organizationId: funnel.organizationId,
          locationId: funnel.locationId,
        })
        .from(funnel)
        .where(eq(funnel.id, funnelId))
        .limit(1);
      if (
        !record ||
        record.organizationId !== organizationId ||
        record.locationId !== locationId
      ) {
        throw new Error("Tracking batch scope did not match the funnel scope.");
      }
      return record;
    });

    const processableEvents = await step.run("exclude-erased-visitors", async () => {
      const anonymousIds = [
        ...new Set(
          events.flatMap((trackingEvent) => {
            const anonymousId = trackingEvent.context.user?.anonymousId;
            return anonymousId ? [anonymousId] : [];
          }),
        ),
      ];
      if (anonymousIds.length === 0) return events;

      const erasedProfiles = await db
        .select({ anonymousId: anonymousUserProfiles.anonymousId })
        .from(anonymousUserProfiles)
        .where(
          and(
            eq(anonymousUserProfiles.organizationId, organizationId),
            locationId
              ? eq(anonymousUserProfiles.locationId, locationId)
              : isNull(anonymousUserProfiles.locationId),
            inArray(anonymousUserProfiles.anonymousId, anonymousIds),
            isNotNull(anonymousUserProfiles.deletionRequestedAt),
          ),
        );
      const erasedAnonymousIds = new Set(
        erasedProfiles.map((profile) => profile.anonymousId),
      );
      return events.filter((trackingEvent) => {
        const anonymousId = trackingEvent.context.user?.anonymousId;
        return !anonymousId || !erasedAnonymousIds.has(anonymousId);
      });
    });
    if (processableEvents.length === 0) {
      return { success: true, eventsProcessed: 0 };
    }

    // Step 1: Parse and enrich events
    const enrichedEvents = await step.run("enrich-events", async () => {
      // Parse IP address once for all events in this batch (they share the same IP)
      const geoInfo = await parseIPAddress(ipAddress);

      const enriched = processableEvents.map((evt) => {
        // Use SDK-parsed device info if available, otherwise parse server-side
        const sdkDeviceInfo = evt.context.device;
        const isKnownValue = (value?: string) =>
          !!value && value !== "Unknown" && value !== "unknown";
        const hasSDKParsedData =
          isKnownValue(sdkDeviceInfo?.deviceType) &&
          isKnownValue(sdkDeviceInfo?.browserName);
        
        // Fallback to server-side parsing if SDK didn't send parsed data
        // Pass screen dimensions for accurate laptop/desktop detection
        const serverParsed = !hasSDKParsedData && sdkDeviceInfo?.userAgent 
          ? parseUserAgent(
              sdkDeviceInfo.userAgent,
              sdkDeviceInfo.screenWidth,
              sdkDeviceInfo.screenHeight
            )
          : null;

         // Extract Core Web Vitals if this is a web_vital event
        const isWebVital = evt.eventName === "web_vital";
        const vitalMetric = isWebVital ? evt.properties?.metric : null;
        
        // Extract funnel stage from properties
        const funnelStage = evt.properties?.stage || evt.properties?.currentStage || evt.properties?._currentStage || null;
        
        // Extract user-defined event category (from new SDK trackEvent)
        const eventCategory = evt.properties?._category || null;
        const eventValue = evt.properties?._value || null;
        const eventDescription = evt.properties?._description || null;
        const eventColor = evt.properties?._color || null;

        const firstTouchUtm = evt.context.firstTouchUtm;
        const lastTouchUtm = evt.context.lastTouchUtm;
        const primaryAbTest = evt.context.abTests?.[0];
        
        // Check if this is a micro-conversion event
        const isMicroConversion = evt.eventName === "micro_conversion" || !!eventCategory;
        const microConversionType = isMicroConversion 
          ? (evt.properties?.microConversionType || evt.eventName)
          : null;
        const microConversionValue = isMicroConversion 
          ? (evt.properties?.value || eventValue || 50)
          : null;
        
        return {
          eventId: evt.eventId,
          funnelId,
          locationId,

          eventName: evt.eventName,
          eventProperties: evt.properties || {},

          sessionId: evt.context.session.sessionId,
          userId: evt.context.user?.userId,
          anonymousId: evt.context.user?.anonymousId,

          pageUrl: evt.context.page?.url,
          pagePath: evt.context.page?.path,
          pageTitle: evt.context.page?.title,
          referrer: evt.context.page?.referrer,

          utmSource: evt.context.utm?.source,
          utmMedium: evt.context.utm?.medium,
          utmCampaign: evt.context.utm?.campaign,
          utmTerm: evt.context.utm?.term,
          utmContent: evt.context.utm?.content,

          firstTouchUtmSource: firstTouchUtm?.source,
          firstTouchUtmMedium: firstTouchUtm?.medium,
          firstTouchUtmCampaign: firstTouchUtm?.campaign,
          firstTouchUtmTerm: firstTouchUtm?.term,
          firstTouchUtmContent: firstTouchUtm?.content,
          firstTouchTimestamp: firstTouchUtm?.timestamp
            ? new Date(firstTouchUtm.timestamp)
            : null,

          lastTouchUtmSource: lastTouchUtm?.source,
          lastTouchUtmMedium: lastTouchUtm?.medium,
          lastTouchUtmCampaign: lastTouchUtm?.campaign,
          lastTouchUtmTerm: lastTouchUtm?.term,
          lastTouchUtmContent: lastTouchUtm?.content,
          lastTouchTimestamp: lastTouchUtm?.timestamp
            ? new Date(lastTouchUtm.timestamp)
            : null,
          
          // Ad Platform Click IDs (for attribution)
          fbclid: evt.context.clickIds?.fbclid,
          fbp: evt.context.cookies?.fbp,
          fbc: evt.context.cookies?.fbc,
          gclid: evt.context.clickIds?.gclid,
          gbraid: evt.context.clickIds?.gbraid,
          wbraid: evt.context.clickIds?.wbraid,
          dclid: evt.context.clickIds?.dclid,
          ttclid: evt.context.clickIds?.ttclid,
          ttp: evt.context.cookies?.ttp,
          msclkid: evt.context.clickIds?.msclkid,
          twclid: evt.context.clickIds?.twclid,
          li_fat_id: evt.context.clickIds?.li_fat_id,
          ScCid: evt.context.clickIds?.ScCid,
          epik: evt.context.clickIds?.epik,
          rdt_cid: evt.context.clickIds?.rdt_cid,

          userAgent: sdkDeviceInfo?.userAgent,
          // Prefer SDK-parsed data, fallback to server-parsed (avoid "Unknown" masking)
          deviceType: isKnownValue(sdkDeviceInfo?.deviceType)
            ? sdkDeviceInfo?.deviceType
            : serverParsed?.deviceType || "Unknown",
          browserName: isKnownValue(sdkDeviceInfo?.browserName)
            ? sdkDeviceInfo?.browserName
            : serverParsed?.browserName || "Unknown",
          browserVersion: isKnownValue(sdkDeviceInfo?.browserVersion)
            ? sdkDeviceInfo?.browserVersion
            : serverParsed?.browserVersion || "Unknown",
          osName: isKnownValue(sdkDeviceInfo?.osName)
            ? sdkDeviceInfo?.osName
            : serverParsed?.osName || "Unknown",
          osVersion: isKnownValue(sdkDeviceInfo?.osVersion)
            ? sdkDeviceInfo?.osVersion
            : serverParsed?.osVersion || "Unknown",
          screenWidth: sdkDeviceInfo?.screenWidth,
          screenHeight: sdkDeviceInfo?.screenHeight,

          ipAddress,
          countryCode: geoInfo.countryCode,
          countryName: geoInfo.countryName,
          region: geoInfo.region,
          city: geoInfo.city,
          timezone: sdkDeviceInfo?.timezone,

          isConversion: trustLevel === "VERIFIED_FORM",
          conversionType:
            trustLevel === "VERIFIED_FORM" ? "lead" : undefined,
          revenue: evt.properties?.revenue,
          currency: evt.properties?.currency,
          orderId: evt.properties?.orderId,
          
          // Funnel tracking
          funnelStage,
          isMicroConversion,
          microConversionType,
          microConversionValue,
          eventCategory,
          eventDescription,
          eventColor,

          // A/B Testing
          abTestId: primaryAbTest?.testId,
          abTestVariant: primaryAbTest?.variant,

          // Lead Scoring
          leadScore: evt.context.leadScore?.score,
          leadScoreGrade: evt.context.leadScore?.grade,

          // Engagement Tracking
          engagementScore: evt.context.engagement?.score,
          engagementLevel: evt.context.engagement?.level,

          // Custom dimensions
          customDimensions: evt.context.customDimensions || undefined,

          // Core Web Vitals
          lcp: vitalMetric === "lcp" ? evt.properties?.value : null,
          inp: vitalMetric === "inp" ? evt.properties?.value : null,
          cls: vitalMetric === "cls" ? evt.properties?.value : null,
          fcp: vitalMetric === "fcp" ? evt.properties?.value : null,
          ttfb: vitalMetric === "ttfb" ? evt.properties?.value : null,
          vitalRating: isWebVital ? evt.properties?.rating : null,

          timestamp: new Date(evt.timestamp),
          serverTimestamp: new Date(),
        };
      });
      return enriched as Array<typeof enriched[0] & { timestamp: Date }>;
    });

    // Step 2: Store events in database
    const insertedEventIds = await step.run("store-events", async () => {
      if (enrichedEvents.length === 0) return [];
      const inserted = await db
        .insert(funnelEvent)
        .values(
          enrichedEvents.map((event) => ({
            ...event,
            id: crypto.randomUUID(),
            timestamp: new Date(event.timestamp),
            serverTimestamp: new Date(event.serverTimestamp),
            firstTouchTimestamp:
              event.firstTouchTimestamp == null ? null : new Date(event.firstTouchTimestamp),
            lastTouchTimestamp:
              event.lastTouchTimestamp == null ? null : new Date(event.lastTouchTimestamp),
            revenue: event.revenue == null ? event.revenue : String(event.revenue),
          }))
        )
        .onConflictDoNothing({ target: funnelEvent.eventId })
        .returning({ eventId: funnelEvent.eventId });
      return inserted.map((record) => record.eventId);
    });
    const insertedEventIdSet = new Set(insertedEventIds);
    const acceptedEvents = enrichedEvents.filter((event) =>
      insertedEventIdSet.delete(event.eventId),
    );
    if (acceptedEvents.length === 0) {
      return { success: true, eventsProcessed: 0 };
    }

    // Step 2.5: Push events to real-time cache for instant SSE delivery
    await step.run("push-to-realtime-cache", async () => {
      // Map enriched events to cached event format
      const cachedEvents = acceptedEvents.map((e) => ({
        id: e.eventId,
        eventName: e.eventName,
        pagePath: e.pagePath ?? null,
        pageTitle: e.pageTitle ?? null,
        userId: e.userId ?? null,
        anonymousId: e.anonymousId ?? null,
        deviceType: e.deviceType ?? null,
        browserName: e.browserName ?? null,
        countryCode: e.countryCode ?? null,
        city: e.city ?? null,
        isConversion: e.isConversion,
        revenue: e.revenue ? Number(e.revenue) : null,
        timestamp: new Date(e.timestamp), // Ensure it's a Date object
        utmSource: e.utmSource ?? null,
        utmMedium: e.utmMedium ?? null,
        utmCampaign: e.utmCampaign ?? null,
        // Core Web Vitals
        lcp: e.lcp ?? null,
        inp: e.inp ?? null,
        cls: e.cls ?? null,
        fcp: e.fcp ?? null,
        ttfb: e.ttfb ?? null,
        vitalRating: e.vitalRating ?? null,
        // Funnel tracking
        funnelStage: e.funnelStage ?? null,
        isMicroConversion: e.isMicroConversion,
        microConversionType: e.microConversionType ?? null,
        microConversionValue: e.microConversionValue ?? null,
        eventCategory: e.eventCategory ?? null,
      }));

      pushRealtimeEvents(funnelId, cachedEvents);
    });

    // Step 3: Create or update user profiles
    const resolvedProfiles = await step.run("upsert-user-profiles", async () => {
      const anonymousIds = [
        ...new Set(acceptedEvents.map((event) => event.anonymousId).filter(Boolean)),
      ];
      const resolved: Array<{ anonymousId: string; profileId: string }> = [];

      for (const anonymousId of anonymousIds) {
        if (!anonymousId) continue;
        const userEvents = acceptedEvents.filter(
          (event) => event.anonymousId === anonymousId,
        );
        const eventsCount = userEvents.length;
        const existingProfile = await db.query.anonymousUserProfiles.findFirst({
          where: and(
            eq(anonymousUserProfiles.organizationId, organizationId),
            locationId
              ? eq(anonymousUserProfiles.locationId, locationId)
              : isNull(anonymousUserProfiles.locationId),
            eq(anonymousUserProfiles.anonymousId, anonymousId),
          ),
          columns: { id: true },
        });
        const profileId =
          existingProfile?.id ??
          buildAnonymousProfileId({ organizationId, locationId }, anonymousId);
        if (existingProfile) {
          await db
            .update(anonymousUserProfiles)
            .set({
              lastSeen: new Date(userEvents[userEvents.length - 1].timestamp),
              totalEvents: sql`${anonymousUserProfiles.totalEvents} + ${eventsCount}`,
            })
            .where(eq(anonymousUserProfiles.id, profileId));
        } else {
          await db
            .insert(anonymousUserProfiles)
            .values({
              id: profileId,
              organizationId,
              locationId,
              anonymousId,
              displayName: generateUserName(),
              firstSeen: new Date(userEvents[0].timestamp),
              lastSeen: new Date(userEvents[userEvents.length - 1].timestamp),
              totalEvents: eventsCount,
              totalSessions: 0,
            })
            .onConflictDoUpdate({
              target: anonymousUserProfiles.id,
              set: {
                lastSeen: new Date(userEvents[userEvents.length - 1].timestamp),
                totalEvents: sql`${anonymousUserProfiles.totalEvents} + ${eventsCount}`,
              },
            });
        }
        resolved.push({ anonymousId, profileId });
      }
      return resolved;
    });
    const profileIdByAnonymousId = new Map(
      resolvedProfiles.map((profile) => [profile.anonymousId, profile.profileId]),
    );

    const getLifecycleStage = (totalSessions: number, lastSeen?: Date | null) => {
      if (lastSeen) {
        const daysSinceLastSeen =
          (Date.now() - new Date(lastSeen).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastSeen >= 30) return "CHURNED";
      }
      if (totalSessions >= 5) return "LOYAL";
      if (totalSessions >= 2) return "RETURNING";
      return "NEW";
    };

    const getCityCoordinates = async (
      city?: string | null,
      countryCode?: string | null,
      countryName?: string | null,
      region?: string | null
    ): Promise<GeoCoordinates> => {
      if (!city || city === "Unknown") return null;

      const originalCountryCode = countryCode?.trim().toUpperCase();
      const normalizedCountryCode = normalizeCountryCode(countryCode);
      const normalizedCountryName = countryName?.trim();
      if (!normalizedCountryCode && !normalizedCountryName && !originalCountryCode) {
        return null;
      }

      const cacheKey = `${city.trim().toLowerCase()}||${
        originalCountryCode ||
        normalizedCountryCode ||
        normalizedCountryName?.toLowerCase() ||
        "unknown"
      }||${region?.trim().toLowerCase() || ""}`;
      if (cityGeoCache.has(cacheKey)) {
        return cityGeoCache.get(cacheKey) || null;
      }

      const existingConditions: SQL[] = [
        eq(funnelSession.funnelId, funnelId),
        eq(funnelSession.city, city),
        isNotNull(funnelSession.latitude),
        isNotNull(funnelSession.longitude),
      ];
      if (normalizedCountryName) {
        existingConditions.push(eq(funnelSession.countryName, normalizedCountryName));
      }
      if (normalizedCountryCode && originalCountryCode) {
        existingConditions.push(inArray(funnelSession.countryCode, [normalizedCountryCode, originalCountryCode]));
      } else if (normalizedCountryCode || originalCountryCode) {
        existingConditions.push(eq(funnelSession.countryCode, normalizedCountryCode || originalCountryCode || ""));
      }
      if (region) existingConditions.push(eq(funnelSession.region, region));

      const existing = await db.query.funnelSession.findFirst({
        where: and(...existingConditions),
        columns: {
          latitude: true,
          longitude: true,
        },
      });

      if (existing?.latitude && existing?.longitude) {
        const coords = {
          latitude: existing.latitude,
          longitude: existing.longitude,
        };
        cityGeoCache.set(cacheKey, coords);
        return coords;
      }

      cityGeoCache.set(cacheKey, null);
      return null;
    };

    // Step 4: Update or create sessions
    await step.run("update-sessions", async () => {
      const sessionIds = [...new Set(acceptedEvents.map((e) => e.sessionId))];

      for (const sessionId of sessionIds) {
        const sessionEvents = acceptedEvents.filter((e) => e.sessionId === sessionId);
        const firstEvent = sessionEvents[0];
        const lastEvent = sessionEvents[sessionEvents.length - 1];

        const hasConversion = sessionEvents.some((e) => e.isConversion);
        const conversionEvent = sessionEvents.find((e) => e.isConversion);

        const firstSourceValue = firstEvent.utmSource || firstEvent.firstTouchUtmSource || firstEvent.lastTouchUtmSource || null;
        const firstMediumValue = firstEvent.utmMedium || firstEvent.firstTouchUtmMedium || firstEvent.lastTouchUtmMedium || null;
        const firstCampaignValue = firstEvent.utmCampaign || firstEvent.firstTouchUtmCampaign || firstEvent.lastTouchUtmCampaign || null;
        const lastSourceValue = lastEvent.utmSource || lastEvent.lastTouchUtmSource || lastEvent.firstTouchUtmSource || null;
        const lastMediumValue = lastEvent.utmMedium || lastEvent.lastTouchUtmMedium || lastEvent.firstTouchUtmMedium || null;
        const lastCampaignValue = lastEvent.utmCampaign || lastEvent.lastTouchUtmCampaign || lastEvent.firstTouchUtmCampaign || null;

        // Query ALL events for this session from the database to calculate accurate duration
        const allSessionEvents = await db.query.funnelEvent.findMany({
          where: and(
            eq(funnelEvent.sessionId, sessionId),
            eq(funnelEvent.funnelId, funnelId),
          ),
          orderBy: (event, { asc }) => asc(event.timestamp),
          columns: {
            timestamp: true,
            eventName: true,
            eventProperties: true,
          },
        });

        // Calculate session duration using ALL events (DB + current batch)
        // Combine existing DB events with new batch events
        const allTimestamps = [
          ...allSessionEvents.map((e) => new Date(e.timestamp).getTime()),
          ...sessionEvents.map((e) => new Date(e.timestamp).getTime()),
        ];
        
        const firstTimestamp = new Date(Math.min(...allTimestamps));
        const lastTimestamp = new Date(Math.max(...allTimestamps));
        const startTime = firstTimestamp.getTime();
        const endTime = lastTimestamp.getTime();
        const durationMs = endTime - startTime;

        // Extract session_end event if exists (from current batch or DB)
        const sessionEndEvent = sessionEvents.find(
          (e) => e.eventName === "session_end",
        );
        const storedSessionEndEvent = allSessionEvents.find(
          (e) => e.eventName === "session_end",
        );
        const sessionEndProps = asUnknownRecord(
          sessionEndEvent?.eventProperties ?? storedSessionEndEvent?.eventProperties,
        );
        const sessionDuration = finiteNumber(sessionEndProps.duration);
        const activeTime = finiteNumber(sessionEndProps.activeTime);
        const idleTime = finiteNumber(sessionEndProps.idleTime);
        const engagementRate = finiteNumber(sessionEndProps.engagementRate);
        
        // Calculate Core Web Vitals averages for this session
        const vitalEvents = sessionEvents.filter((e) => e.eventName === "web_vital");
        const lcpValues = vitalEvents.flatMap((e) => e.lcp == null ? [] : [e.lcp]);
        const inpValues = vitalEvents.flatMap((e) => e.inp == null ? [] : [e.inp]);
        const clsValues = vitalEvents.flatMap((e) => e.cls == null ? [] : [e.cls]);
        const fcpValues = vitalEvents.flatMap((e) => e.fcp == null ? [] : [e.fcp]);
        const ttfbValues = vitalEvents.flatMap((e) => e.ttfb == null ? [] : [e.ttfb]);

        const avgLcp = lcpValues.length > 0 ? lcpValues.reduce((a, b) => a + b, 0) / lcpValues.length : null;
        const avgInp = inpValues.length > 0 ? inpValues.reduce((a, b) => a + b, 0) / inpValues.length : null;
        const avgCls = clsValues.length > 0 ? clsValues.reduce((a, b) => a + b, 0) / clsValues.length : null;
        const avgFcp = fcpValues.length > 0 ? fcpValues.reduce((a, b) => a + b, 0) / fcpValues.length : null;
        const avgTtfb = ttfbValues.length > 0 ? ttfbValues.reduce((a, b) => a + b, 0) / ttfbValues.length : null;

        // Calculate experience score (0-100) based on Core Web Vitals
        const calculateExperienceScore = () => {
          const scores: number[] = [];
          
          if (avgLcp !== null) {
            scores.push(avgLcp <= 2500 ? 100 : avgLcp <= 4000 ? 60 : 20);
          }
          if (avgInp !== null) {
            scores.push(avgInp <= 200 ? 100 : avgInp <= 500 ? 60 : 20);
          }
          if (avgCls !== null) {
            scores.push(avgCls <= 0.1 ? 100 : avgCls <= 0.25 ? 60 : 20);
          }
          if (avgFcp !== null) {
            scores.push(avgFcp <= 1800 ? 100 : avgFcp <= 3000 ? 60 : 20);
          }
          if (avgTtfb !== null) {
            scores.push(avgTtfb <= 800 ? 100 : avgTtfb <= 1800 ? 60 : 20);
          }
          
          return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
        };

        const experienceScore = calculateExperienceScore();

        const existingSession = await db.query.funnelSession.findFirst({
          where: and(
            eq(funnelSession.sessionId, sessionId),
            eq(funnelSession.funnelId, funnelId),
          ),
          columns: {
            id: true,
            firstSource: true,
            firstMedium: true,
            firstCampaign: true,
            firstReferrer: true,
            countryCode: true,
            countryName: true,
            region: true,
            city: true,
            latitude: true,
            longitude: true,
          },
        });
        
        const isNewSession = !existingSession;
        
        // Determine if we should update first* fields
        // Update if: 1) it's a new session, OR 2) existing session has NULL first* fields
        const shouldUpdateFirst = isNewSession || !existingSession.firstSource;

        const hasKnownGeo = (value?: string | null) =>
          !!value && value !== "Unknown";
        const resolveGeoValue = (
          primary?: string | null,
          fallback?: string | null
        ) => (hasKnownGeo(primary) ? primary : hasKnownGeo(fallback) ? fallback : primary || fallback || null);
        const shouldUpdateGeo =
          isNewSession ||
          !hasKnownGeo(existingSession.countryCode) ||
          !hasKnownGeo(existingSession.countryName);

        const shouldUpdateCoords =
          isNewSession ||
          !existingSession.latitude ||
          !existingSession.longitude;

        const resolvedCountryCode = resolveGeoValue(
          firstEvent.countryCode,
          lastEvent.countryCode
        );
        const resolvedCountryName = resolveGeoValue(
          firstEvent.countryName,
          lastEvent.countryName
        );
        const resolvedRegion = resolveGeoValue(
          firstEvent.region,
          lastEvent.region
        );
        const resolvedCity = resolveGeoValue(
          firstEvent.city,
          lastEvent.city
        );

        const cityCoordinates = await getCityCoordinates(
          resolvedCity,
          resolvedCountryCode,
          resolvedCountryName,
          resolvedRegion
        );

        const sessionCreate = {
            id: crypto.randomUUID(),
            sessionId,
            funnelId,
            locationId,
            userId: firstEvent.userId,
            anonymousId: firstEvent.anonymousId,
            profileId: firstEvent.anonymousId
              ? profileIdByAnonymousId.get(firstEvent.anonymousId)
              : undefined,

            startedAt: firstTimestamp,
            updatedAt: new Date(),
            endedAt: lastTimestamp,
            durationSeconds: sessionDuration ?? Math.floor(durationMs / 1000),
            activeTimeSeconds: activeTime ?? null,
            idleTimeSeconds: idleTime ?? null,
            engagementRate: engagementRate ?? null,

            // Core Web Vitals aggregates
            avgLcp,
            avgInp,
            avgCls,
            avgFcp,
            avgTtfb,
            experienceScore,

            firstSource: firstSourceValue,
            firstMedium: firstMediumValue,
            firstCampaign: firstCampaignValue,
            firstReferrer: firstEvent.referrer,
            firstPageUrl: firstEvent.pageUrl,

            lastSource: lastSourceValue,
            lastMedium: lastMediumValue,
            lastCampaign: lastCampaignValue,
            lastPageUrl: lastEvent.pageUrl,
            
            // Ad Platform Click IDs - First Touch
            firstFbclid: firstEvent.fbclid,
            firstGclid: firstEvent.gclid,
            firstTtclid: firstEvent.ttclid,
            firstMsclkid: firstEvent.msclkid,
            firstTwclid: firstEvent.twclid,
            firstLiFatId: firstEvent.li_fat_id,
            
            // Ad Platform Click IDs - Last Touch
            lastFbclid: lastEvent.fbclid,
            lastGclid: lastEvent.gclid,
            lastTtclid: lastEvent.ttclid,
            lastMsclkid: lastEvent.msclkid,
            lastTwclid: lastEvent.twclid,
            lastLiFatId: lastEvent.li_fat_id,
            
            // Google Enhanced Conversions IDs
            gbraid: lastEvent.gbraid,
            wbraid: lastEvent.wbraid,
            
            // First-party cookies (for Conversion APIs)
            fbp: firstEvent.fbp,
            fbc: firstEvent.fbc,
            ttp: firstEvent.ttp,
            
            // Determine conversion platform from click IDs
            conversionPlatform: firstEvent.fbclid ? 'facebook'
              : firstEvent.gclid ? 'google'
              : firstEvent.ttclid ? 'tiktok'
              : firstEvent.msclkid ? 'microsoft'
              : firstEvent.twclid ? 'twitter'
              : firstEvent.li_fat_id ? 'linkedin'
              : firstSourceValue === 'google' && !firstEvent.gclid ? 'google-organic'
              : firstSourceValue ? firstSourceValue
              : firstEvent.referrer ? 'referral'
              : 'direct',

            pageViews: sessionEvents.filter((e) => e.eventName === "page_view").length,
            eventsCount: sessionEvents.length,

            converted: hasConversion,
            conversionValue: conversionEvent?.revenue == null ? conversionEvent?.revenue : String(conversionEvent.revenue),
            conversionType: conversionEvent?.conversionType,

            ipAddress,
            userAgent: firstEvent.userAgent,
            deviceType: firstEvent.deviceType,
            browserName: firstEvent.browserName,
            browserVersion: firstEvent.browserVersion,
            osName: firstEvent.osName,
            osVersion: firstEvent.osVersion,
            countryCode: resolvedCountryCode,
            countryName: resolvedCountryName,
            region: resolvedRegion,
            city: resolvedCity,
            ...(cityCoordinates && {
              latitude: cityCoordinates.latitude,
              longitude: cityCoordinates.longitude,
            }),
            
            // Attribution tracking (persisted UTM)
            firstTouchSource: firstEvent.firstTouchUtmSource,
            lastTouchSource: lastEvent.lastTouchUtmSource,
        };
        const sessionUpdates = {
            updatedAt: new Date(),
            endedAt: lastTimestamp,
            durationSeconds: sessionDuration ?? Math.floor(durationMs / 1000),
            activeTimeSeconds: activeTime ?? null,
            idleTimeSeconds: idleTime ?? null,
            engagementRate: engagementRate ?? null,

            // Update Core Web Vitals if we have new data
            ...(avgLcp !== null && { avgLcp }),
            ...(avgInp !== null && { avgInp }),
            ...(avgCls !== null && { avgCls }),
            ...(avgFcp !== null && { avgFcp }),
            ...(avgTtfb !== null && { avgTtfb }),
            ...(experienceScore !== null && { experienceScore }),

            // FIX: Update firstSource/Medium/Campaign/Click IDs ONLY if they're currently NULL
            // This handles the case where the session was created without UTM/click ID data
            ...(shouldUpdateFirst && {
              firstSource: firstSourceValue,
              firstMedium: firstMediumValue,
              firstCampaign: firstCampaignValue,
              firstReferrer: firstEvent.referrer,
              firstFbclid: firstEvent.fbclid,
              firstGclid: firstEvent.gclid,
              firstTtclid: firstEvent.ttclid,
              firstMsclkid: firstEvent.msclkid,
              firstTwclid: firstEvent.twclid,
              firstLiFatId: firstEvent.li_fat_id,
              fbp: firstEvent.fbp,
              fbc: firstEvent.fbc,
              ttp: firstEvent.ttp,
              conversionPlatform: firstEvent.fbclid ? 'facebook'
                : firstEvent.gclid ? 'google'
                : firstEvent.ttclid ? 'tiktok'
                : firstEvent.msclkid ? 'microsoft'
                : firstEvent.twclid ? 'twitter'
                : firstEvent.li_fat_id ? 'linkedin'
                : firstSourceValue === 'google' && !firstEvent.gclid ? 'google-organic'
                : firstSourceValue ? firstSourceValue
                : firstEvent.referrer ? 'referral'
                : 'direct',
            }),

            ...(shouldUpdateGeo && {
              countryCode: resolvedCountryCode,
              countryName: resolvedCountryName,
              region: resolvedRegion,
              city: resolvedCity,
            }),
            ...(shouldUpdateCoords && cityCoordinates && {
              latitude: cityCoordinates.latitude,
              longitude: cityCoordinates.longitude,
            }),
            
            lastSource: lastSourceValue,
            lastMedium: lastMediumValue,
            lastCampaign: lastCampaignValue,
            lastPageUrl: lastEvent.pageUrl,
            
            // Update last touch click IDs
            lastFbclid: lastEvent.fbclid,
            lastGclid: lastEvent.gclid,
            lastTtclid: lastEvent.ttclid,
            lastMsclkid: lastEvent.msclkid,
            lastTwclid: lastEvent.twclid,
            lastLiFatId: lastEvent.li_fat_id,
            
            // Update Google Enhanced Conversions IDs
            gbraid: lastEvent.gbraid,
            wbraid: lastEvent.wbraid,

            pageViews: sql`${funnelSession.pageViews} + ${sessionEvents.filter((e) => e.eventName === "page_view").length}`,
            eventsCount: sql`${funnelSession.eventsCount} + ${sessionEvents.length}`,

            ...(hasConversion && {
              converted: true,
              conversionValue: conversionEvent?.revenue == null ? conversionEvent?.revenue : String(conversionEvent.revenue),
              conversionType: conversionEvent?.conversionType,
            }),

            // Keep persisted UTM touchpoints up to date
            ...(firstEvent.firstTouchUtmSource && {
              firstTouchSource: firstEvent.firstTouchUtmSource,
            }),
            ...(lastEvent.lastTouchUtmSource && {
              lastTouchSource: lastEvent.lastTouchUtmSource,
            }),
        };

        let sessionWasCreated = false;
        if (existingSession) {
          await db
            .update(funnelSession)
            .set(sessionUpdates)
            .where(
              and(
                eq(funnelSession.sessionId, sessionId),
                eq(funnelSession.funnelId, funnelId),
              ),
            );
        } else {
          const [createdSession] = await db
            .insert(funnelSession)
            .values(sessionCreate)
            .onConflictDoNothing({
              target: [funnelSession.funnelId, funnelSession.sessionId],
            })
            .returning({ id: funnelSession.id });
          sessionWasCreated = createdSession !== undefined;
          if (!sessionWasCreated) {
            await db
              .update(funnelSession)
              .set(sessionUpdates)
              .where(
                and(
                  eq(funnelSession.sessionId, sessionId),
                  eq(funnelSession.funnelId, funnelId),
                ),
              );
          }
        }

        // Increment session count for user profile if this is a new session
        const firstEventProfileId = firstEvent.anonymousId
          ? profileIdByAnonymousId.get(firstEvent.anonymousId)
          : undefined;
        if (sessionWasCreated && firstEventProfileId) {
          await db
            .update(anonymousUserProfiles)
            .set({ totalSessions: sql`${anonymousUserProfiles.totalSessions} + 1` })
            .where(eq(anonymousUserProfiles.id, firstEventProfileId));
        }
      }
    });

    // Step 4.1: Update visitor lifecycle stages
    await step.run("update-visitor-lifecycle", async () => {
      const profileIds = [...new Set(profileIdByAnonymousId.values())];

      for (const profileId of profileIds) {
        if (!profileId) continue;

        const profile = await db.query.anonymousUserProfiles.findFirst({
          where: and(
            eq(anonymousUserProfiles.id, profileId),
            eq(anonymousUserProfiles.organizationId, organizationId),
            locationId
              ? eq(anonymousUserProfiles.locationId, locationId)
              : isNull(anonymousUserProfiles.locationId),
          ),
          columns: {
            id: true,
            totalSessions: true,
            lastSeen: true,
          },
        });

        if (!profile) continue;

        const nextStage = getLifecycleStage(
          profile.totalSessions,
          profile.lastSeen
        );

        await db
          .update(anonymousUserProfiles)
          .set({ lifecycleStage: nextStage })
          .where(eq(anonymousUserProfiles.id, profile.id));
      }
    });

    // Step 4.5: Handle funnel tracking and session bridging
    await step.run("handle-funnel-tracking", async () => {
      // Handle funnel_stage_entered events
      const stageEvents = acceptedEvents.filter((e) => e.eventName === "funnel_stage_entered");
      for (const stageEvent of stageEvents) {
        const { stage, stageHistory } = stageEvent.eventProperties || {};
        if (!stage || !stageEvent.sessionId) continue;
        
        await db
          .update(funnelSession)
          .set({
            currentStage: stage,
            stageHistory: stageHistory || [],
          })
          .where(
            and(
              eq(funnelSession.sessionId, stageEvent.sessionId),
              eq(funnelSession.funnelId, funnelId),
            ),
          )
          .catch(() => {
          // Session might not exist yet - will be created in next batch
        });
      }
      
      // Handle checkout_started events
      const checkoutStartedEvents = acceptedEvents.filter((e) => e.eventName === "checkout_started");
      for (const checkoutEvent of checkoutStartedEvents) {
        const { sessionId } = checkoutEvent;
        if (!sessionId) continue;
        
        await db
          .update(funnelSession)
          .set({
            checkoutStartedAt: new Date(checkoutEvent.timestamp),
            currentStage: "checkout",
          })
          .where(
            and(
              eq(funnelSession.sessionId, sessionId),
              eq(funnelSession.funnelId, funnelId),
            ),
          )
          .catch(() => {
          // Session might not exist yet
        });
      }
      
      // Handle checkout_completed events with session bridging
      const checkoutCompletedEvents = acceptedEvents.filter((e) => e.eventName === "checkout_completed");
      for (const completionEvent of checkoutCompletedEvents) {
        const { sessionId } = completionEvent;
        const { originalSessionId, checkoutDuration } = completionEvent.eventProperties || {};
        
        if (!sessionId) continue;
        
        // Link current session to original session if available
        const updateData: Partial<typeof funnelSession.$inferInsert> = {
          checkoutCompletedAt: new Date(completionEvent.timestamp),
          currentStage: "purchase",
          converted: true,
          conversionValue:
            completionEvent.revenue == null
              ? undefined
              : String(completionEvent.revenue),
          conversionType: "purchase",
        };
        
        if (typeof originalSessionId === "string") {
          const originalSession = await db.query.funnelSession.findFirst({
            where: and(
              eq(funnelSession.sessionId, originalSessionId),
              eq(funnelSession.funnelId, funnelId),
            ),
            columns: { id: true },
          });
          if (originalSession) updateData.linkedSessionId = originalSession.id;
        }
        
        if (checkoutDuration) {
          updateData.checkoutDuration = checkoutDuration;
        }
        
        await db
          .update(funnelSession)
          .set(updateData)
          .where(
            and(
              eq(funnelSession.sessionId, sessionId),
              eq(funnelSession.funnelId, funnelId),
            ),
          )
          .catch(() => {
          // Session might not exist yet
        });
      }
      
      // Handle checkout_abandoned events
      const checkoutAbandonedEvents = acceptedEvents.filter((e) => e.eventName === "checkout_abandoned");
      for (const abandonEvent of checkoutAbandonedEvents) {
        const { sessionId } = abandonEvent;
        const { reason } = abandonEvent.eventProperties || {};
        
        if (!sessionId) continue;
        
        await db
          .update(funnelSession)
          .set({
            isAbandoned: true,
            abandonedAt: new Date(abandonEvent.timestamp),
            abandonReason: reason || "unknown",
            currentStage: "abandoned",
          })
          .where(
            and(
              eq(funnelSession.sessionId, sessionId),
              eq(funnelSession.funnelId, funnelId),
            ),
          )
          .catch(() => {
          // Session might not exist yet
        });
      }
    });

    // Step 4.6: Send server-side conversion events through tenant-owned accounts.
    await step.run("send-ad-platform-conversions", async () => {
      const conversionEvents = acceptedEvents.filter((event) => event.isConversion);
      if (conversionEvents.length === 0) return;

      for (const event of conversionEvents) {
        const { sessionId } = event;
        if (!sessionId) continue;

        const session = await db.query.funnelSession.findFirst({
          where: and(
            eq(funnelSession.sessionId, sessionId),
            eq(funnelSession.funnelId, funnelId),
          ),
          columns: {
            lastFbclid: true,
            lastGclid: true,
            lastTtclid: true,
            gbraid: true,
            wbraid: true,
            fbp: true,
            fbc: true,
            ttp: true,
            funnelId: true,
          },
        });
        if (!session || session.funnelId !== funnelId) continue;

        const properties = asUnknownRecord(event.eventProperties);
        await dispatchAdConversionEvent({
          scope: authoritativeFunnel,
          event: {
            eventId: event.eventId,
            kind: event.eventName === "checkout_completed" ? "PURCHASE" : "LEAD",
            occurredAt: new Date(event.timestamp),
            email: stringProperty(properties, "email"),
            phone: stringProperty(properties, "phone"),
            value: finiteNumber(event.revenue),
            currency: stringProperty(properties, "currency") ?? "USD",
            orderId: stringProperty(properties, "orderId") ?? event.eventId,
            pageUrl: event.pageUrl,
            ipAddress: event.ipAddress,
            userAgent: event.userAgent,
            fbclid: session.lastFbclid ?? undefined,
            fbp: session.fbp ?? undefined,
            fbc: session.fbc ?? undefined,
            gclid: session.lastGclid ?? undefined,
            gbraid: session.gbraid ?? undefined,
            wbraid: session.wbraid ?? undefined,
            ttclid: session.lastTtclid ?? undefined,
            ttp: session.ttp ?? undefined,
          },
        });
      }
    });

    // Step 4.7: Handle user identification events
    await step.run("handle-user-identification", async () => {
      const identifyEvents = acceptedEvents.filter((e) => e.eventName === "user_identified");
      
      for (const identifyEvent of identifyEvents) {
        const { userId, anonymousId, traits } = identifyEvent.eventProperties || {};
        
        if (typeof anonymousId !== "string" || !anonymousId || !userId) continue;
        const existingProfile = await db.query.anonymousUserProfiles.findFirst({
          where: and(
            eq(anonymousUserProfiles.organizationId, organizationId),
            locationId
              ? eq(anonymousUserProfiles.locationId, locationId)
              : isNull(anonymousUserProfiles.locationId),
            eq(anonymousUserProfiles.anonymousId, anonymousId),
          ),
          columns: { id: true },
        });
        const profileId =
          existingProfile?.id ??
          buildAnonymousProfileId({ organizationId, locationId }, anonymousId);
        
        await db
          .insert(anonymousUserProfiles)
          .values({
            id: profileId,
            organizationId,
            locationId,
            anonymousId,
            displayName: traits?.name || traits?.email || userId,
            identifiedUserId: userId,
            identifiedAt: new Date(),
            userProperties: traits || {},
            firstSeen: new Date(identifyEvent.timestamp),
            lastSeen: new Date(identifyEvent.timestamp),
          })
          .onConflictDoUpdate({
            target: anonymousUserProfiles.id,
            set: {
              displayName: traits?.name || traits?.email || userId,
              identifiedUserId: userId,
              identifiedAt: new Date(),
              userProperties: traits || {},
              lastSeen: new Date(identifyEvent.timestamp),
            },
          });
        
        // Update all sessions for this anonymous user to link to identified user
        await db
          .update(funnelSession)
          .set({ userId })
          .where(
            and(
              eq(funnelSession.anonymousId, anonymousId),
              eq(funnelSession.funnelId, funnelId),
            ),
          );
      }
    });

    // Step 5: Create or update clients for conversions
    const conversions = acceptedEvents.filter((e) => e.isConversion);

    for (const conversion of conversions) {
      await step.run(`process-conversion-${conversion.eventId}`, async () => {
        // Only create client if we have a userId (email)
        if (!conversion.userId) return;

        const email = conversion.userId;

        // Check if client exists
        const existingClient = await db.query.client.findFirst({
          where: and(eq(client.organizationId, organizationId), eq(client.email, email)),
        });

        if (existingClient) {
          // Update existing client
          await db
            .update(client)
            .set({
              lifecycleStage: "CUSTOMER",
              score: (existingClient.score ?? 0) + 50,
              metadata: {
                ...asUnknownRecord(existingClient.metadata),
                funnelConversion: {
                  funnelId,
                  date: new Date().toISOString(),
                  revenue: conversion.revenue,
                  type: conversion.conversionType,
                },
              },
              updatedAt: new Date(),
            })
            .where(eq(client.id, existingClient.id));
        } else {
          // Create new client
          await db.insert(client).values({
              id: crypto.randomUUID(),
              organizationId,
              locationId,
              name: email.split('@')[0],
              email,
              source: `funnel:${funnelId}`,
              lifecycleStage: "CUSTOMER",
              score: 50,
              updatedAt: new Date(),
              metadata: {
                funnelConversion: {
                  funnelId,
                  date: new Date().toISOString(),
                  revenue: conversion.revenue,
                  type: conversion.conversionType,
                },
              },
          });
        }
      });

      // Step 6: Trigger workflows for conversion events
      await step.run(`trigger-workflows-${conversion.eventId}`, async () => {
        // Funnel conversion workflow triggers are intentionally disabled until the node type exists.
        const workflows: Array<{ id: string }> = [];

        // Trigger each workflow
        for (const workflow of workflows) {
          await sendWorkflowExecution({
            workflowId: workflow.id,
            trigger: "funnel_conversion",
            data: {
              funnelId,
              eventId: conversion.eventId,
              userId: conversion.userId,
              revenue: conversion.revenue,
              conversionType: conversion.conversionType,
              orderId: conversion.orderId,
              timestamp: new Date(conversion.timestamp).toISOString(),
            },
          });
        }
      });
    }

    return { success: true, eventsProcessed: acceptedEvents.length };
  }
);
