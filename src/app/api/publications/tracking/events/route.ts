import { NextResponse } from "next/server";

import { z } from "zod";

import { inngest } from "@/inngest/client";
import {
  publicationTrackingBatchSchema,
  type PublicationTrackingBatch,
} from "@/features/publications/public/tracking-contract";
import {
  getPublicationTrackingCategories,
  publicationConsentCookieName,
} from "@/features/publications/public/consent";
import { verifyPublicationTrackingToken } from "@/features/publications/public/tracking-token";
import { getPublishedTrackingSource } from "@/features/publications/server/tracking-source";
import {
  enforcePublicationRequestQuota,
  PUBLIC_TRACKING_QUOTA,
  PublicationQuotaExceededError,
  PublicationQuotaUnavailableError,
} from "@/features/publications/server/publication-request-quota";
import {
  readBoundedRawBody,
  WebhookPayloadTooLargeError,
} from "@/features/webhooks/server/bounded-raw-body";

const MAX_TRACKING_BODY_BYTES = 16 * 1_024;
const MAX_EVENT_AGE_MS = 10 * 60 * 1_000;
const MAX_EVENT_FUTURE_MS = 60 * 1_000;

export async function POST(request: Request) {
  try {
    if (!requestIsSameOrigin(request)) {
      return response("Tracking requests must use the published page origin.", 403);
    }
    if (
      request.headers.get("sec-gpc") === "1" ||
      request.headers.get("dnt") === "1"
    ) {
      return response("Analytics tracking is not permitted.", 403);
    }
    const body = publicationTrackingBatchSchema.parse(
      JSON.parse(await readBoundedRawBody(request, MAX_TRACKING_BODY_BYTES)),
    );
    const token = verifyPublicationTrackingToken(body.token);
    if (!token) return response("Tracking token is invalid or expired.", 401);

    const source = await getPublishedTrackingSource(token);
    if (!source) return response("Published tracking source was not found.", 404);
    const trackingCategories = getPublicationTrackingCategories({
      analytics: source.analytics,
      config: source.consent,
      cookieValue: readCookie(
        request.headers.get("cookie"),
        publicationConsentCookieName(source.targetId),
      ),
    });
    if (!trackingCategories.includes("ANALYTICS")) {
      return response("Analytics tracking is not permitted.", 403);
    }
    if (!eventsAreCurrent(body.events)) {
      return response("Tracking event time is outside the accepted window.", 400);
    }
    await enforcePublicationRequestQuota({
      request,
      organizationId: source.organizationId,
      targetId: source.targetId,
      policy: PUBLIC_TRACKING_QUOTA,
    });

    await inngest.send({
      name: "tracking/events.batch",
      data: {
        funnelId: token.funnelId,
        locationId: source.locationId,
        organizationId: source.organizationId,
        events: body.events.map((event) => ({
          eventId: `publication:${token.targetId}:${event.eventId}`,
          eventName: event.eventName,
          properties: event.properties,
          context: {
            page: {
              url: event.page.path,
              path: event.page.path,
              ...(event.page.title ? { title: event.page.title } : {}),
              ...(event.page.referrerOrigin
                ? { referrer: event.page.referrerOrigin }
                : {}),
            },
            ...(event.utm ? { utm: event.utm } : {}),
            gdpr: {
              consentGiven: source.consent.mode === "REQUIRED",
              consentVersion: source.consent.version,
            },
            session: { sessionId: event.sessionId },
          },
          timestamp: event.occurredAt,
        })),
        ipAddress: "unknown",
        trustLevel: "TELEMETRY",
      },
    });

    return NextResponse.json({ accepted: body.events.length }, { status: 202 });
  } catch (error) {
    if (error instanceof PublicationQuotaExceededError) {
      return NextResponse.json(
        { error: "Tracking request limit reached." },
        {
          status: 429,
          headers: { "Retry-After": String(error.retryAfterSeconds) },
        },
      );
    }
    if (error instanceof PublicationQuotaUnavailableError) {
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

function requestIsSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") === "same-origin";
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function eventsAreCurrent(events: PublicationTrackingBatch["events"]): boolean {
  const now = Date.now();
  return events.every(
    (event) =>
      event.occurredAt >= now - MAX_EVENT_AGE_MS &&
      event.occurredAt <= now + MAX_EVENT_FUTURE_MS,
  );
}

function readCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return undefined;
}

function response(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
