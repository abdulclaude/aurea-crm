import { inngest } from "../client";
import db from "@/lib/db";
import { sendWorkflowExecution } from "../utils";
import { generateUserName } from "@/features/external-funnels/lib/generate-user-name";
import {
	parseUserAgent as parseUA,
	parseIPAddress,
} from "@/lib/device-parser";
import { pushRealtimeEvents } from "@/lib/realtime-cache";
import { sendMetaPurchase, sendMetaLead } from "@/lib/ads/meta/conversion-api";
import { sendGooglePurchase, sendGoogleLead } from "@/lib/ads/google/enhanced-conversions";
import { sendTikTokPurchase, sendTikTokLead } from "@/lib/ads/tiktok/events-api";

interface TrackingEvent {
  eventId: string;
  eventName: string;
  properties?: Record<string, any>;
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
    customDimensions?: Record<string, any>;
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

export const processTrackingEvents = inngest.createFunction(
  {
    id: "process-tracking-events",
    retries: 3,
  },
  { event: "tracking/events.batch" },
  async ({ event, step }) => {
    const { funnelId, subaccountId, organizationId, events, ipAddress } = event.data as {
      funnelId: string;
      subaccountId: string | null;
      organizationId: string;
      events: TrackingEvent[];
      ipAddress: string;
    };

    // Step 1: Parse and enrich events
    const enrichedEvents = await step.run("enrich-events", async () => {
      // Parse IP address once for all events in this batch (they share the same IP)
      const geoInfo = await parseIPAddress(ipAddress);
      
      // DEBUG: Log first event's UTM data
      if (events.length > 0) {
        console.log('[DEBUG] First event UTM data:', {
          utmSource: events[0].context.utm?.source,
          utmMedium: events[0].context.utm?.medium,
          utmCampaign: events[0].context.utm?.campaign,
          pageUrl: events[0].context.page?.url,
        });
      }
      
      const enriched = events.map((evt) => {
        // DEBUG: Log ALL event contexts to see what's missing
        console.log(`[DEBUG] Event ${evt.eventName} context:`, {
          hasClickIds: !!evt.context.clickIds,
          clickIds: evt.context.clickIds,
          hasUtm: !!evt.context.utm,
          utm: evt.context.utm,
        });
        
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
          subaccountId,

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
          
          // DEBUG: Log extracted click IDs
          ...(evt.eventName === 'checkout_completed' && console.log('[DEBUG] Extracted click IDs for checkout:', {
            fbclid: evt.context.clickIds?.fbclid,
            gclid: evt.context.clickIds?.gclid,
          }), {}),
          
          // DEBUG: Log click ID extraction for page_view
          ...(evt.eventName === 'page_view' && console.log('[DEBUG] Page view click IDs:', {
            fbclid: evt.context.clickIds?.fbclid,
            gclid: evt.context.clickIds?.gclid,
            ttclid: evt.context.clickIds?.ttclid,
            msclkid: evt.context.clickIds?.msclkid,
            url: evt.context.page?.url,
          }), {}),

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

          isConversion: evt.eventName === "conversion" || evt.eventName === "purchase" || evt.eventName === "checkout_completed",
          conversionType: evt.properties?.conversionType,
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
    await step.run("store-events", async () => {
      await db.funnelEvent.createMany({
        data: enrichedEvents,
        skipDuplicates: true, // Prevent duplicate eventIds
      });
    });

    // Step 2.5: Push events to real-time cache for instant SSE delivery
    await step.run("push-to-realtime-cache", async () => {
      // Map enriched events to cached event format
      const cachedEvents = enrichedEvents.map((e) => ({
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
    await step.run("upsert-user-profiles", async () => {
      const anonymousIds = [...new Set(enrichedEvents.map((e) => e.anonymousId).filter(Boolean))];

      for (const anonymousId of anonymousIds) {
        if (!anonymousId) continue;

        const userEvents = enrichedEvents.filter((e) => e.anonymousId === anonymousId);
        const eventsCount = userEvents.length;

        await db.anonymousUserProfile.upsert({
          where: { id: anonymousId },
          create: {
            id: anonymousId,
            displayName: generateUserName(),
            firstSeen: new Date(userEvents[0].timestamp),
            lastSeen: new Date(userEvents[userEvents.length - 1].timestamp),
            totalEvents: eventsCount,
            totalSessions: 0, // Will be updated when we create sessions
          },
          update: {
            lastSeen: new Date(userEvents[userEvents.length - 1].timestamp),
            totalEvents: {
              increment: eventsCount,
            },
          },
        });
      }
    });

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

    // Step 4: Update or create sessions
    await step.run("update-sessions", async () => {
      const sessionIds = [...new Set(enrichedEvents.map((e) => e.sessionId))];

      for (const sessionId of sessionIds) {
        const sessionEvents = enrichedEvents.filter((e: any) => e.sessionId === sessionId);
        const firstEvent = sessionEvents[0];
        const lastEvent = sessionEvents[sessionEvents.length - 1];

        const hasConversion = sessionEvents.some((e: any) => e.isConversion);
        const conversionEvent = sessionEvents.find((e: any) => e.isConversion);

        const firstSourceValue = firstEvent.utmSource || firstEvent.firstTouchUtmSource || firstEvent.lastTouchUtmSource || null;
        const firstMediumValue = firstEvent.utmMedium || firstEvent.firstTouchUtmMedium || firstEvent.lastTouchUtmMedium || null;
        const firstCampaignValue = firstEvent.utmCampaign || firstEvent.firstTouchUtmCampaign || firstEvent.lastTouchUtmCampaign || null;
        const lastSourceValue = lastEvent.utmSource || lastEvent.lastTouchUtmSource || lastEvent.firstTouchUtmSource || null;
        const lastMediumValue = lastEvent.utmMedium || lastEvent.lastTouchUtmMedium || lastEvent.firstTouchUtmMedium || null;
        const lastCampaignValue = lastEvent.utmCampaign || lastEvent.lastTouchUtmCampaign || lastEvent.firstTouchUtmCampaign || null;

        // Query ALL events for this session from the database to calculate accurate duration
        const allSessionEvents = await db.funnelEvent.findMany({
          where: { sessionId },
          orderBy: { timestamp: 'asc' },
          select: {
            timestamp: true,
            eventName: true,
            eventProperties: true,
          },
        });

        // Calculate session duration using ALL events (DB + current batch)
        // Combine existing DB events with new batch events
        const allTimestamps = [
          ...allSessionEvents.map((e: any) => new Date(e.timestamp).getTime()),
          ...sessionEvents.map((e: any) => new Date(e.timestamp).getTime()),
        ];
        
        const firstTimestamp = new Date(Math.min(...allTimestamps));
        const lastTimestamp = new Date(Math.max(...allTimestamps));
        const startTime = firstTimestamp.getTime();
        const endTime = lastTimestamp.getTime();
        const durationMs = endTime - startTime;

        // Extract session_end event if exists (from current batch or DB)
        const sessionEndEvent = sessionEvents.find((e: any) => e.eventName === "session_end") ||
          allSessionEvents.find((e: any) => e.eventName === "session_end");
        const sessionEndProps = (sessionEndEvent?.eventProperties as any) || {};
        
        // Calculate Core Web Vitals averages for this session
        const vitalEvents = sessionEvents.filter((e: any) => e.eventName === "web_vital");
        const lcpValues = vitalEvents.filter((e: any) => e.lcp != null).map((e: any) => e.lcp);
        const inpValues = vitalEvents.filter((e: any) => e.inp != null).map((e: any) => e.inp);
        const clsValues = vitalEvents.filter((e: any) => e.cls != null).map((e: any) => e.cls);
        const fcpValues = vitalEvents.filter((e: any) => e.fcp != null).map((e: any) => e.fcp);
        const ttfbValues = vitalEvents.filter((e: any) => e.ttfb != null).map((e: any) => e.ttfb);

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

        const existingSession = await db.funnelSession.findUnique({
          where: { sessionId },
          select: { 
            id: true,
            firstSource: true,
            firstMedium: true,
            firstCampaign: true,
            firstReferrer: true,
            countryCode: true,
            countryName: true,
            region: true,
            city: true,
          },
        });
        
        const isNewSession = !existingSession;
        
        // @ts-ignore - TypeScript hasn't picked up the new Prisma types yet
        
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

        // DEBUG: Log session creation data
        console.log('[DEBUG] Creating/updating session:', {
          sessionId,
          isNew: isNewSession,
          shouldUpdateFirst,
          existingFirstSource: existingSession?.firstSource,
          firstEventUTM: {
            source: firstEvent.utmSource,
            medium: firstEvent.utmMedium,
            campaign: firstEvent.utmCampaign,
          },
          firstEventName: firstEvent.eventName,
        });

        console.log('[DEBUG] *** UPSERT SESSION WITH CLICK IDS ***', {
          sessionId,
          fbclid: lastEvent.fbclid,
          gclid: lastEvent.gclid,
          gbraid: lastEvent.gbraid,
          wbraid: lastEvent.wbraid,
        });
        
        console.log('[DEBUG] *** ABOUT TO UPSERT SESSION ***', {
          sessionId,
          lastEventFbclid: lastEvent.fbclid,
          lastEventGclid: lastEvent.gclid,
          lastEventGbraid: lastEvent.gbraid,
          lastEventWbraid: lastEvent.wbraid,
        });
        
        await db.funnelSession.upsert({
          where: { sessionId },
          create: {
            sessionId,
            funnelId,
            subaccountId,
            userId: firstEvent.userId,
            anonymousId: firstEvent.anonymousId,
            profileId: firstEvent.anonymousId,

            startedAt: firstTimestamp,
            endedAt: lastTimestamp,
            durationSeconds: sessionEndProps.duration || Math.floor(durationMs / 1000),
            activeTimeSeconds: sessionEndProps.activeTime || null,
            idleTimeSeconds: sessionEndProps.idleTime || null,
            engagementRate: sessionEndProps.engagementRate || null,

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
            conversionValue: conversionEvent?.revenue,
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
            
            // Attribution tracking (persisted UTM)
            firstTouchSource: firstEvent.firstTouchUtmSource,
            lastTouchSource: lastEvent.lastTouchUtmSource,
          },
          update: {
            endedAt: lastTimestamp,
            durationSeconds: sessionEndProps.duration || Math.floor(durationMs / 1000),
            activeTimeSeconds: sessionEndProps.activeTime || null,
            idleTimeSeconds: sessionEndProps.idleTime || null,
            engagementRate: sessionEndProps.engagementRate || null,

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

            pageViews: {
              increment: sessionEvents.filter((e) => e.eventName === "page_view").length,
            },
            eventsCount: {
              increment: sessionEvents.length,
            },

            ...(hasConversion && {
              converted: true,
              conversionValue: conversionEvent?.revenue,
              conversionType: conversionEvent?.conversionType,
            }),

            // Keep persisted UTM touchpoints up to date
            ...(firstEvent.firstTouchUtmSource && {
              firstTouchSource: firstEvent.firstTouchUtmSource,
            }),
            ...(lastEvent.lastTouchUtmSource && {
              lastTouchSource: lastEvent.lastTouchUtmSource,
            }),
          },
        });

        // Increment session count for user profile if this is a new session
        if (isNewSession && firstEvent.anonymousId) {
          await db.anonymousUserProfile.update({
            where: { id: firstEvent.anonymousId },
            data: {
              totalSessions: {
                increment: 1,
              },
            },
          });
        }
      }
    });

    // Step 4.1: Update visitor lifecycle stages
    await step.run("update-visitor-lifecycle", async () => {
      const anonymousIds = [
        ...new Set(enrichedEvents.map((e) => e.anonymousId).filter(Boolean)),
      ];

      for (const anonymousId of anonymousIds) {
        if (!anonymousId) continue;

        const profile = await db.anonymousUserProfile.findUnique({
          where: { id: anonymousId },
          select: {
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

        await db.anonymousUserProfile.update({
          where: { id: profile.id },
          data: { lifecycleStage: nextStage },
        });
      }
    });

    // Step 4.5: Handle funnel tracking and session bridging
    await step.run("handle-funnel-tracking", async () => {
      // Handle funnel_stage_entered events
      const stageEvents = enrichedEvents.filter((e) => e.eventName === "funnel_stage_entered");
      for (const stageEvent of stageEvents) {
        const { stage, stageHistory } = stageEvent.eventProperties || {};
        if (!stage || !stageEvent.sessionId) continue;
        
        await db.funnelSession.update({
          where: { sessionId: stageEvent.sessionId },
          data: {
            currentStage: stage,
            stageHistory: stageHistory || [],
          },
        }).catch(() => {
          // Session might not exist yet - will be created in next batch
        });
      }
      
      // Handle checkout_started events
      const checkoutStartedEvents = enrichedEvents.filter((e) => e.eventName === "checkout_started");
      for (const checkoutEvent of checkoutStartedEvents) {
        const { sessionId } = checkoutEvent;
        if (!sessionId) continue;
        
        await db.funnelSession.update({
          where: { sessionId },
          data: {
            checkoutStartedAt: new Date(checkoutEvent.timestamp),
            currentStage: "checkout",
          },
        }).catch(() => {
          // Session might not exist yet
        });
      }
      
      // Handle checkout_completed events with session bridging
      const checkoutCompletedEvents = enrichedEvents.filter((e) => e.eventName === "checkout_completed");
      for (const completionEvent of checkoutCompletedEvents) {
        const { sessionId } = completionEvent;
        const { originalSessionId, checkoutDuration } = completionEvent.eventProperties || {};
        
        if (!sessionId) continue;
        
        // Link current session to original session if available
        const updateData: any = {
          checkoutCompletedAt: new Date(completionEvent.timestamp),
          currentStage: "purchase",
          converted: true,
          conversionValue: completionEvent.revenue,
          conversionType: "purchase",
        };
        
        if (originalSessionId) {
          updateData.linkedSessionId = originalSessionId;
        }
        
        if (checkoutDuration) {
          updateData.checkoutDuration = checkoutDuration;
        }
        
        await db.funnelSession.update({
          where: { sessionId },
          data: updateData,
        }).catch(() => {
          // Session might not exist yet
        });
      }
      
      // Handle checkout_abandoned events
      const checkoutAbandonedEvents = enrichedEvents.filter((e) => e.eventName === "checkout_abandoned");
      for (const abandonEvent of checkoutAbandonedEvents) {
        const { sessionId } = abandonEvent;
        const { reason } = abandonEvent.eventProperties || {};
        
        if (!sessionId) continue;
        
        await db.funnelSession.update({
          where: { sessionId },
          data: {
            isAbandoned: true,
            abandonedAt: new Date(abandonEvent.timestamp),
            abandonReason: reason || "unknown",
            currentStage: "abandoned",
          },
        }).catch(() => {
          // Session might not exist yet
        });
      }
    });

    // Step 4.6: Send server-side conversion events to ad platforms
    await step.run("send-ad-platform-conversions", async () => {
      console.log("[Ad Conversions] Starting ad conversions step...");
      
      // Get conversion events (checkout_completed and form_submitted)
      const conversionEvents = enrichedEvents.filter((e) => 
        e.eventName === "checkout_completed" || e.eventName === "form_submitted"
      );
      
      console.log(`[Ad Conversions] Found ${conversionEvents.length} conversion events`);

      for (const event of conversionEvents) {
        const { sessionId } = event;
        console.log(`[Ad Conversions] Processing event ${event.eventId} for session ${sessionId}`);
        
        if (!sessionId) {
          console.log("[Ad Conversions] No sessionId, skipping");
          continue;
        }

        // Get session data with click IDs
        const session = await db.funnelSession.findUnique({
          where: { sessionId },
          select: {
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

        if (!session) {
          console.log(`[Ad Conversions] Session ${sessionId} not found in database, skipping`);
          continue;
        }
        
        console.log(`[Ad Conversions] Session data:`, {
          sessionId,
          lastFbclid: session.lastFbclid,
          lastGclid: session.lastGclid,
          lastTtclid: session.lastTtclid,
          gbraid: session.gbraid,
          wbraid: session.wbraid,
          fbp: session.fbp,
          fbc: session.fbc,
        });

        // Get ad platform credentials from environment variables
        // TODO: This should be retrieved from a new AdPlatformCredential table
        // For now, we use env vars which work for both subaccount and external funnels
        const metaPixelId = process.env.META_PIXEL_ID;
        const metaAccessToken = process.env.META_CAPI_ACCESS_TOKEN;
        const metaTestEventCode = process.env.META_TEST_EVENT_CODE;
        const googleCustomerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
        const googleConversionActionId = process.env.GOOGLE_ADS_CONVERSION_ACTION_ID;
        const googleDeveloperToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
        const googleAccessToken = process.env.GOOGLE_ADS_ACCESS_TOKEN;
        const tiktokPixelCode = process.env.TIKTOK_PIXEL_ID;
        const tiktokAccessToken = process.env.TIKTOK_ACCESS_TOKEN;

        const isPurchase = event.eventName === "checkout_completed";
        const isLead = event.eventName === "form_submitted";

        // Prepare common data
        const email = event.eventProperties?.email;
        const phone = event.eventProperties?.phone;
        const value = event.revenue;
        const currency = event.eventProperties?.currency || "USD";
        const orderId = event.eventProperties?.orderId || event.eventId;

        // Send to Meta if fbclid is present
        console.log(`[Ad Conversions] Checking Meta conditions:`, {
          hasLastFbclid: !!session.lastFbclid,
          hasMetaPixelId: !!metaPixelId,
          hasMetaAccessToken: !!metaAccessToken,
          isPurchase,
          isLead,
        });
        
        if (session.lastFbclid && metaPixelId && metaAccessToken) {
          console.log(`[Ad Conversions] Sending to Meta...`);
          try {
            if (isPurchase) {
              await sendMetaPurchase(
                { 
                  pixelId: metaPixelId, 
                  accessToken: metaAccessToken,
                  testEventCode: metaTestEventCode 
                },
                {
                  eventId: event.eventId,
                  email,
                  phone,
                  value: value || 0,
                  currency,
                  orderId,
                  fbclid: session.lastFbclid,
                  fbp: session.fbp || undefined,
                  fbc: session.fbc || undefined,
                  ipAddress: event.ipAddress,
                  userAgent: event.userAgent,
                  eventTime: Math.floor(new Date(event.timestamp).getTime() / 1000),
                }
              );
              console.log(`[Ad Conversions] Sent Meta purchase for event ${event.eventId}`);
            } else if (isLead) {
              await sendMetaLead(
                { 
                  pixelId: metaPixelId, 
                  accessToken: metaAccessToken,
                  testEventCode: metaTestEventCode 
                },
                {
                  eventId: event.eventId,
                  email,
                  phone,
                  value,
                  currency,
                  fbclid: session.lastFbclid,
                  fbp: session.fbp || undefined,
                  fbc: session.fbc || undefined,
                  ipAddress: event.ipAddress,
                  userAgent: event.userAgent,
                  eventTime: Math.floor(new Date(event.timestamp).getTime() / 1000),
                }
              );
              console.log(`[Ad Conversions] Sent Meta lead for event ${event.eventId}`);
            }
          } catch (error) {
            console.error(`[Ad Conversions] Meta error for event ${event.eventId}:`, error);
          }
        }

        // Send to Google if gclid/gbraid/wbraid is present
        if ((session.lastGclid || session.gbraid || session.wbraid) && 
            googleCustomerId && googleConversionActionId && googleDeveloperToken && googleAccessToken) {
          try {
            const conversionDateTime = new Date(event.timestamp).toISOString()
              .replace('T', ' ')
              .replace(/\.\d{3}Z$/, '+00:00');

            if (isPurchase) {
              await sendGooglePurchase(
                {
                  customerId: googleCustomerId,
                  conversionActionId: googleConversionActionId,
                  developerToken: googleDeveloperToken,
                  accessToken: googleAccessToken,
                },
                {
                  gclid: session.lastGclid || undefined,
                  gbraid: session.gbraid || undefined,
                  wbraid: session.wbraid || undefined,
                  email,
                  phone,
                  value: value || 0,
                  currency,
                  orderId,
                  conversionDateTime,
                }
              );
              console.log(`[Ad Conversions] Sent Google purchase for event ${event.eventId}`);
            } else if (isLead) {
              await sendGoogleLead(
                {
                  customerId: googleCustomerId,
                  conversionActionId: googleConversionActionId,
                  developerToken: googleDeveloperToken,
                  accessToken: googleAccessToken,
                },
                {
                  gclid: session.lastGclid || undefined,
                  gbraid: session.gbraid || undefined,
                  wbraid: session.wbraid || undefined,
                  email,
                  phone,
                  value,
                  currency,
                  conversionDateTime,
                }
              );
              console.log(`[Ad Conversions] Sent Google lead for event ${event.eventId}`);
            }
          } catch (error) {
            console.error(`[Ad Conversions] Google error for event ${event.eventId}:`, error);
          }
        }

        // Send to TikTok if ttclid is present
        if (session.lastTtclid && tiktokPixelCode && tiktokAccessToken) {
          try {
            if (isPurchase) {
              await sendTikTokPurchase(
                { pixelCode: tiktokPixelCode, accessToken: tiktokAccessToken },
                {
                  eventId: event.eventId,
                  email,
                  phone,
                  value: value || 0,
                  currency,
                  ttclid: session.lastTtclid,
                  ttp: session.ttp || undefined,
                  ipAddress: event.ipAddress,
                  userAgent: event.userAgent,
                  pageUrl: event.pageUrl,
                }
              );
              console.log(`[Ad Conversions] Sent TikTok purchase for event ${event.eventId}`);
            } else if (isLead) {
              await sendTikTokLead(
                { pixelCode: tiktokPixelCode, accessToken: tiktokAccessToken },
                {
                  eventId: event.eventId,
                  email,
                  phone,
                  value,
                  currency,
                  ttclid: session.lastTtclid,
                  ttp: session.ttp || undefined,
                  ipAddress: event.ipAddress,
                  userAgent: event.userAgent,
                  pageUrl: event.pageUrl,
                }
              );
              console.log(`[Ad Conversions] Sent TikTok lead for event ${event.eventId}`);
            }
          } catch (error) {
            console.error(`[Ad Conversions] TikTok error for event ${event.eventId}:`, error);
          }
        }
      }
    });

    // Step 4.7: Handle user identification events
    await step.run("handle-user-identification", async () => {
      const identifyEvents = enrichedEvents.filter((e) => e.eventName === "user_identified");
      
      for (const identifyEvent of identifyEvents) {
        const { userId, anonymousId, traits } = identifyEvent.eventProperties || {};
        
        if (!anonymousId || !userId) continue;
        
        // Update the anonymous user profile with identified user data
        await db.anonymousUserProfile.update({
          where: { id: anonymousId },
          data: {
            identifiedUserId: userId,
            identifiedAt: new Date(),
            userProperties: traits || {},
            displayName: traits?.name || traits?.email || userId,
          },
        }).catch(() => {
          // Profile might not exist yet, create it
          return db.anonymousUserProfile.create({
            data: {
              id: anonymousId,
              displayName: traits?.name || traits?.email || userId,
              identifiedUserId: userId,
              identifiedAt: new Date(),
              userProperties: traits || {},
              firstSeen: new Date(),
              lastSeen: new Date(),
            },
          });
        });
        
        // Update all sessions for this anonymous user to link to identified user
        await db.funnelSession.updateMany({
          where: { anonymousId },
          data: { userId },
        });
      }
    });

    // Step 5: Create or update contacts for conversions
    const conversions = enrichedEvents.filter((e) => e.isConversion);

    for (const conversion of conversions) {
      await step.run(`process-conversion-${conversion.eventId}`, async () => {
        // Only create contact if we have a userId (email)
        if (!conversion.userId) return;

        const email = conversion.userId;

        // Check if contact exists
        const existingContact = await db.contact.findFirst({
          where: {
            organizationId,
            email,
          },
        });

        if (existingContact) {
          // Update existing contact
          await db.contact.update({
            where: { id: existingContact.id },
            data: {
              lifecycleStage: "CUSTOMER",
              score: { increment: 50 },
              metadata: {
                ...((existingContact.metadata as any) || {}),
                funnelConversion: {
                  funnelId,
                  date: new Date().toISOString(),
                  revenue: conversion.revenue,
                  type: conversion.conversionType,
                },
              },
            },
          });
        } else {
          // Create new contact
          await db.contact.create({
            data: {
              id: crypto.randomUUID(),
              organizationId,
              subaccountId,
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
            },
          });
        }
      });

      // Step 6: Trigger workflows for conversion events
      await step.run(`trigger-workflows-${conversion.eventId}`, async () => {
        // TODO: Find workflows with "Funnel Conversion" trigger
        // For now, skip workflow triggers until we add the FUNNEL_CONVERSION_TRIGGER node type
        const workflows: any[] = [];

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

    return { success: true, eventsProcessed: enrichedEvents.length };
  }
);
