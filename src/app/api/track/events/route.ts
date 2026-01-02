import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";
import { inngest } from "@/inngest/client";
import { getPrivacyCompliantIp } from "@/lib/gdpr-utils";

// Helper to check if IP is private/localhost
function isPrivateIP(ip: string): boolean {
  if (!ip || ip === "unknown") return true;
  const normalized = ip.trim();
  if (
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "localhost" ||
    normalized.includes("::1")
  ) {
    return true;
  }
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("172.")) {
    const second = Number.parseInt(ip.split(".")[1] || "0", 10);
    if (second >= 16 && second <= 31) return true;
  }
  if (ip.startsWith("fc00:") || ip.startsWith("fd00:")) return true; // IPv6 private
  return false;
}

// Fetch real public IP using external service (only in development)
async function fetchPublicIP(): Promise<string | null> {
  try {
    // Using ipify - simple, reliable, free service
    const response = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.ip || null;
  } catch (error) {
    console.error("[Tracking API] Error fetching public IP:", error);
    return null;
  }
}

// UTM schema (reusable for first/last touch)
const UtmSchema = z.object({
  source: z.string().optional(),
  medium: z.string().optional(),
  campaign: z.string().optional(),
  term: z.string().optional(),
  content: z.string().optional(),
});

// Persisted UTM schema (includes timestamp)
const PersistedUtmSchema = UtmSchema.extend({
  timestamp: z.number().optional(),
});

// Event validation schema
const EventSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
  properties: z.record(z.string(), z.any()).optional(),
  context: z.object({
    page: z.object({
      url: z.string(),
      path: z.string(),
      title: z.string().optional(),
      referrer: z.string().optional(),
    }).optional(),
    utm: UtmSchema.optional(),
    
    // First-touch UTM (persisted from first visit with UTM params)
    firstTouchUtm: PersistedUtmSchema.optional(),
    
    // Last-touch UTM (most recent visit with UTM params)
    lastTouchUtm: PersistedUtmSchema.optional(),
    
    clickIds: z.object({
      fbclid: z.string().optional(),
      fbadid: z.string().optional(),
      gclid: z.string().optional(),
      gbraid: z.string().optional(),
      wbraid: z.string().optional(),
      dclid: z.string().optional(),
      ttclid: z.string().optional(),
      tt_content: z.string().optional(),
      msclkid: z.string().optional(),
      twclid: z.string().optional(),
      li_fat_id: z.string().optional(),
      ScCid: z.string().optional(),
      epik: z.string().optional(),
      rdt_cid: z.string().optional(),
    }).optional(),
    cookies: z.object({
      fbp: z.string().optional(),
      fbc: z.string().optional(),
      ttp: z.string().optional(),
    }).optional(),
    gdpr: z.object({
      consentGiven: z.boolean().optional(),
      consentVersion: z.string().optional(),
      consentTimestamp: z.string().optional(),
    }).optional(),
    user: z.object({
      userId: z.string().optional(),
      anonymousId: z.string().optional(),
    }).optional(),
    session: z.object({
      sessionId: z.string(),
    }),
    device: z.object({
      userAgent: z.string().optional(),
      screenWidth: z.number().optional(),
      screenHeight: z.number().optional(),
      language: z.string().optional(),
      timezone: z.string().optional(),
      deviceType: z.string().optional(),
      browserName: z.string().optional(),
      browserVersion: z.string().optional(),
      osName: z.string().optional(),
      osVersion: z.string().optional(),
    }).optional(),
    
    // Custom dimensions (user-defined key-value pairs)
    customDimensions: z.record(z.string(), z.any()).optional(),
    
    // A/B Testing
    abTests: z.array(z.object({
      testId: z.string(),
      variant: z.string(),
    })).optional(),
    
    // Lead Scoring
    leadScore: z.object({
      score: z.number(),
      grade: z.string(),
    }).optional(),
    
    // Engagement Tracking
    engagement: z.object({
      score: z.number(),
      level: z.string(),
    }).optional(),
  }),
  timestamp: z.number(),
});

const BatchRequestSchema = z.object({
  events: z.array(EventSchema),
  batch: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Get headers from request
    const apiKey = req.headers.get("X-Aurea-API-Key");
    const funnelId = req.headers.get("X-Aurea-Funnel-ID");

    if (!apiKey || !funnelId) {
      return NextResponse.json(
        { error: "Missing API key or Funnel ID" },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Verify funnel and API key
    const funnel = await db.funnel.findFirst({
      where: {
        id: funnelId,
        apiKey,
        funnelType: "EXTERNAL",
      },
      select: {
        id: true,
        subaccountId: true,
        organizationId: true,
        trackingConfig: true,
      },
    });

    if (!funnel) {
      return NextResponse.json(
        { error: "Invalid API key or Funnel ID" },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Parse request body
    const body = await req.json();
    const parsed = BatchRequestSchema.parse(body);

    // Get client IP for geo lookup
    let ip =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Allow dev override for GeoIP when running locally
    if (process.env.NODE_ENV === "development" && isPrivateIP(ip)) {
      const headerOverride = req.headers.get("x-geoip-test");
      const envOverride = process.env.DEV_GEOIP_IP;
      const overrideIp = headerOverride || envOverride;
      if (overrideIp) {
        ip = overrideIp;
      }
    }
    
    // OPTIMIZATION: Only fetch public IP for NEW sessions
    // Check if any of the events are from a new session
    const sessionIds = parsed.events.map(e => e.context.session.sessionId);
    const uniqueSessionIds = [...new Set(sessionIds)];
    
    // Check if we already have IP data for these sessions
    const existingSessions = await db.funnelSession.findMany({
      where: {
        sessionId: { in: uniqueSessionIds },
        ipAddress: { not: null },
      },
      select: {
        sessionId: true,
        ipAddress: true,
      },
    });
    
    const hasExistingSession = existingSessions.length > 0;
    const existingIP = existingSessions[0]?.ipAddress;
    
    // Only fetch public IP if:
    // 1. We detect a private IP AND
    // 2. Either it's a NEW session OR the existing session has a private IP
    const shouldFetchPublicIP = isPrivateIP(ip) && (!hasExistingSession || (existingIP && isPrivateIP(existingIP)));
    
    if (shouldFetchPublicIP) {
      console.log(`[Tracking API] Private IP detected: ${ip}, fetching public IP...`);
      try {
        const publicIP = await fetchPublicIP();
        if (publicIP && !isPrivateIP(publicIP)) {
          console.log(`[Tracking API] ✓ Using public IP ${publicIP} instead of private IP ${ip}`);
          ip = publicIP;
        } else {
          console.log(`[Tracking API] ✗ Could not fetch valid public IP, using private IP`);
        }
      } catch (error) {
        console.log(`[Tracking API] ✗ Error fetching public IP:`, error);
      }
    } else if (hasExistingSession && existingIP && !isPrivateIP(existingIP)) {
      // Reuse the PUBLIC IP from the existing session
      console.log(`[Tracking API] Reusing public IP from existing session: ${existingIP}`);
      ip = existingIP;
    } else {
      console.log(`[Tracking API] Using detected IP: ${ip}`);
    }

    // Apply privacy settings to IP (GDPR compliance)
    const trackingConfig = (funnel.trackingConfig as any) || {};
    const anonymizeIp = trackingConfig.anonymizeIp ?? true;
    const hashIp = trackingConfig.hashIp ?? false;
    
    ip = getPrivacyCompliantIp(ip, {
      anonymizeIp,
      hashIp,
    });

    // Process events asynchronously via Inngest
    await inngest.send({
      name: "tracking/events.batch",
      data: {
        funnelId: funnel.id,
        subaccountId: funnel.subaccountId,
        organizationId: funnel.organizationId,
        events: parsed.events,
        ipAddress: ip,
      },
    });

    return NextResponse.json(
      {
        success: true,
        eventsReceived: parsed.events.length,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, X-Aurea-API-Key, X-Aurea-Funnel-ID",
        },
      }
    );
  } catch (error) {
    console.error("[Tracking API] Error processing events:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request format", details: error.issues },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, X-Aurea-API-Key, X-Aurea-Funnel-ID",
    },
  });
}
