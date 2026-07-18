import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { funnel as funnelTable } from "@/db/schema";
import { inngest } from "@/inngest/client";
import {
  externalTelemetryBatchSchema,
  externalTelemetryTimesAreCurrent,
  MAX_EXTERNAL_TELEMETRY_BODY_BYTES,
} from "@/features/external-funnels/lib/external-telemetry-contract";
import {
  enforceFunnelTelemetryQuota,
  FunnelTelemetryQuotaExceededError,
  FunnelTelemetryQuotaUnavailableError,
} from "@/features/external-funnels/server/telemetry-quota";
import {
  readBoundedRawBody,
  WebhookPayloadTooLargeError,
} from "@/features/webhooks/server/bounded-raw-body";
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

export async function POST(req: NextRequest) {
  try {
    if (
      req.headers.get("sec-gpc") === "1" ||
      req.headers.get("dnt") === "1"
    ) {
      return response("Analytics tracking is not permitted.", 403);
    }
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
    const funnel = await db.query.funnel.findFirst({
      where: and(
        eq(funnelTable.id, funnelId),
        eq(funnelTable.apiKey, apiKey),
        eq(funnelTable.funnelType, "EXTERNAL")
      ),
      columns: {
        id: true,
        locationId: true,
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

    const parsed = externalTelemetryBatchSchema.parse(
      JSON.parse(
        await readBoundedRawBody(req, MAX_EXTERNAL_TELEMETRY_BODY_BYTES),
      ),
    );
    if (!externalTelemetryTimesAreCurrent(parsed.events.map((event) => event.timestamp))) {
      return response("Tracking event time is outside the accepted window.", 400);
    }
    await enforceFunnelTelemetryQuota({
      request: req,
      organizationId: funnel.organizationId,
      funnelId: funnel.id,
    });

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
    
    // Apply privacy settings to IP (GDPR compliance)
    const trackingConfig =
      funnel.trackingConfig &&
      typeof funnel.trackingConfig === "object" &&
      !Array.isArray(funnel.trackingConfig)
        ? (funnel.trackingConfig as Record<string, unknown>)
        : {};
    const anonymizeIp =
      typeof trackingConfig.anonymizeIp === "boolean"
        ? trackingConfig.anonymizeIp
        : true;
    const hashIp =
      typeof trackingConfig.hashIp === "boolean" ? trackingConfig.hashIp : false;
    
    ip = getPrivacyCompliantIp(ip, {
      anonymizeIp,
      hashIp,
    });

    // Process events asynchronously via Inngest
    await inngest.send({
      name: "tracking/events.batch",
      data: {
        funnelId: funnel.id,
        locationId: funnel.locationId,
        organizationId: funnel.organizationId,
        events: parsed.events,
        ipAddress: ip,
        trustLevel: "TELEMETRY",
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
    if (error instanceof FunnelTelemetryQuotaExceededError) {
      return NextResponse.json(
        { error: "Tracking request limit reached." },
        {
          status: 429,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Retry-After": String(error.retryAfterSeconds),
          },
        },
      );
    }
    if (error instanceof FunnelTelemetryQuotaUnavailableError) {
      return response("Tracking is temporarily unavailable.", 503);
    }
    if (error instanceof WebhookPayloadTooLargeError) {
      return response("Tracking batch is too large.", 413);
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return response("Tracking batch is invalid.", 400);
    }
    return response("Tracking is temporarily unavailable.", 503);
  }
}

function response(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Access-Control-Allow-Origin": "*" } },
  );
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
