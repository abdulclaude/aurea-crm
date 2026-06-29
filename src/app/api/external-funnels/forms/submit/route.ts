import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  externalFormSubmission,
  form as formTable,
  formSubmission,
  funnel as funnelTable,
} from "@/db/schema";
import { inngest } from "@/inngest/client";
import { getPrivacyCompliantIp } from "@/lib/gdpr-utils";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, X-Aurea-API-Key, X-Aurea-Funnel-ID",
};

const JsonRecordSchema = z.record(z.string(), z.unknown());

const UtmSchema = z
  .object({
    source: z.string().optional(),
    medium: z.string().optional(),
    campaign: z.string().optional(),
    term: z.string().optional(),
    content: z.string().optional(),
    timestamp: z.number().optional(),
  })
  .passthrough();

const TrackingSchema = z
  .object({
    page: z
      .object({
        url: z.string().optional(),
        path: z.string().optional(),
        title: z.string().optional(),
        referrer: z.string().optional(),
      })
      .passthrough()
      .optional(),
    utm: UtmSchema.optional(),
    firstTouchUtm: UtmSchema.optional(),
    lastTouchUtm: UtmSchema.optional(),
    clickIds: JsonRecordSchema.optional(),
    cookies: JsonRecordSchema.optional(),
    user: z
      .object({
        userId: z.string().optional(),
        anonymousId: z.string().optional(),
      })
      .passthrough()
      .optional(),
    session: z
      .object({
        sessionId: z.string().optional(),
      })
      .passthrough()
      .optional(),
    device: JsonRecordSchema.optional(),
    customDimensions: JsonRecordSchema.optional(),
    leadScore: JsonRecordSchema.optional(),
    engagement: JsonRecordSchema.optional(),
  })
  .passthrough();

const CustomFormSubmitSchema = z.object({
  eventName: z.string().default("form_submitted"),
  trackEvent: z.boolean().default(true),
  form: z.object({
    id: z.string().optional(),
    key: z.string().min(1),
    name: z.string().optional(),
    type: z.string().optional(),
    version: z.string().optional(),
  }),
  submission: z.object({
    status: z.string().default("submitted"),
    qualified: z.boolean().optional(),
    score: z.number().optional(),
    reasonCodes: z.array(z.string()).default([]),
    data: JsonRecordSchema,
    normalized: JsonRecordSchema.default({}),
    submittedAt: z.string().datetime().optional(),
  }),
  tracking: TrackingSchema.optional(),
  metadata: JsonRecordSchema.default({}),
});

const getNormalizedString = (
  normalized: Record<string, unknown>,
  key: string,
) => {
  const value = normalized[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const getIpAddress = (req: NextRequest) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  req.headers.get("x-real-ip") ||
  "unknown";

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("X-Aurea-API-Key");
    const funnelId = req.headers.get("X-Aurea-Funnel-ID");

    if (!apiKey || !funnelId) {
      return NextResponse.json(
        { error: "Missing API key or Funnel ID" },
        { status: 401, headers: corsHeaders },
      );
    }

    const funnel = await db.query.funnel.findFirst({
      where: and(
        eq(funnelTable.id, funnelId),
        eq(funnelTable.apiKey, apiKey),
        eq(funnelTable.funnelType, "EXTERNAL"),
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
        { status: 401, headers: corsHeaders },
      );
    }

    const parsed = CustomFormSubmitSchema.parse(await req.json());
    const tracking = parsed.tracking;
    const normalized = parsed.submission.normalized;
    const submissionId = crypto.randomUUID();
    const submittedAt = parsed.submission.submittedAt
      ? new Date(parsed.submission.submittedAt)
      : new Date();
    const userAgent =
      req.headers.get("user-agent") ||
      (typeof tracking?.device?.userAgent === "string"
        ? tracking.device.userAgent
        : undefined);

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
      typeof trackingConfig.hashIp === "boolean"
        ? trackingConfig.hashIp
        : false;

    const ipAddress = getPrivacyCompliantIp(getIpAddress(req), {
      anonymizeIp,
      hashIp,
    });

    let mirroredFormSubmissionId: string | null = null;
    let crmFormId = parsed.form.id ?? null;

    if (crmFormId) {
      const crmForm = await db.query.form.findFirst({
        where: and(
          eq(formTable.id, crmFormId),
          eq(formTable.organizationId, funnel.organizationId),
        ),
        columns: {
          id: true,
        },
      });

      if (!crmForm) {
        return NextResponse.json(
          { error: "Form ID does not belong to this external funnel" },
          { status: 400, headers: corsHeaders },
        );
      }
    }

    await db.insert(externalFormSubmission).values({
      id: submissionId,
      funnelId: funnel.id,
      organizationId: funnel.organizationId,
      locationId: funnel.locationId,
      formId: crmFormId,
      formKey: parsed.form.key,
      formName: parsed.form.name,
      formType: parsed.form.type,
      formVersion: parsed.form.version,
      status: parsed.submission.status,
      qualified: parsed.submission.qualified,
      score: parsed.submission.score,
      reasonCodes: parsed.submission.reasonCodes,
      data: parsed.submission.data,
      normalized,
      metadata: parsed.metadata,
      sessionId: tracking?.session?.sessionId,
      anonymousId: tracking?.user?.anonymousId,
      userId: tracking?.user?.userId,
      pageUrl: tracking?.page?.url,
      pagePath: tracking?.page?.path,
      pageTitle: tracking?.page?.title,
      referrer: tracking?.page?.referrer,
      utmSource: tracking?.utm?.source,
      utmMedium: tracking?.utm?.medium,
      utmCampaign: tracking?.utm?.campaign,
      utmTerm: tracking?.utm?.term,
      utmContent: tracking?.utm?.content,
      firstTouchUtm: tracking?.firstTouchUtm,
      lastTouchUtm: tracking?.lastTouchUtm,
      clickIds: tracking?.clickIds,
      cookies: tracking?.cookies,
      device: tracking?.device,
      ipAddress,
      userAgent,
      submittedAt,
      createdAt: new Date(),
    });

    if (crmFormId) {
      mirroredFormSubmissionId = crypto.randomUUID();
      await db.insert(formSubmission).values({
        id: mirroredFormSubmissionId,
        formId: crmFormId,
        data: parsed.submission.data,
        utmSource: tracking?.utm?.source,
        utmMedium: tracking?.utm?.medium,
        utmCampaign: tracking?.utm?.campaign,
        utmTerm: tracking?.utm?.term,
        utmContent: tracking?.utm?.content,
        ipAddress,
        userAgent,
        referrer: tracking?.page?.referrer,
        submittedAt,
      });
    }

    if (parsed.trackEvent) {
      const sessionId =
        tracking?.session?.sessionId ?? `server-form-${submissionId}`;

      await inngest.send({
        name: "tracking/events.batch",
        data: {
          funnelId: funnel.id,
          locationId: funnel.locationId,
          organizationId: funnel.organizationId,
          ipAddress,
          events: [
            {
              eventId: `form_${submissionId}`,
              eventName: parsed.eventName,
              properties: {
                conversionType: "lead",
                formKey: parsed.form.key,
                formName: parsed.form.name,
                formType: parsed.form.type,
                formVersion: parsed.form.version,
                submissionId,
                status: parsed.submission.status,
                qualified: parsed.submission.qualified,
                score: parsed.submission.score,
                reasonCodes: parsed.submission.reasonCodes,
                email: getNormalizedString(normalized, "email"),
                phone: getNormalizedString(normalized, "phone"),
                firstName: getNormalizedString(normalized, "firstName"),
                lastName: getNormalizedString(normalized, "lastName"),
                country: getNormalizedString(normalized, "country"),
              },
              context: {
                page: tracking?.page,
                utm: tracking?.utm,
                firstTouchUtm: tracking?.firstTouchUtm,
                lastTouchUtm: tracking?.lastTouchUtm,
                clickIds: tracking?.clickIds,
                cookies: tracking?.cookies,
                user: tracking?.user,
                session: { sessionId },
                device: tracking?.device,
                customDimensions: tracking?.customDimensions,
                leadScore: tracking?.leadScore,
                engagement: tracking?.engagement,
              },
              timestamp: submittedAt.getTime(),
            },
          ],
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        submissionId,
        mirroredFormSubmissionId,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("[External forms API] Error submitting custom form:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request format", details: error.issues },
        { status: 400, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
