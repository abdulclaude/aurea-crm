import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
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
import {
  enforceFunnelRequestQuota,
  FunnelTelemetryQuotaExceededError,
  FunnelTelemetryQuotaUnavailableError,
} from "@/features/external-funnels/server/telemetry-quota";
import {
  readBoundedRawBody,
  WebhookPayloadTooLargeError,
} from "@/features/webhooks/server/bounded-raw-body";
import { externalTelemetryTimesAreCurrent } from "@/features/external-funnels/lib/external-telemetry-contract";
import { requestFormSubmittedWorkflowDispatch } from "@/features/workflows/server/form-submitted-trigger-service";
import { formCrmResolutionIsEnabled } from "@/features/forms-builder/lib/form-crm-resolution";

const MAX_EXTERNAL_FORM_BODY_BYTES = 65_536;

class IdempotencyConflictError extends Error {
  constructor() {
    super("Idempotency key was reused with a different payload");
    this.name = "IdempotencyConflictError";
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, X-Aurea-API-Key, X-Aurea-Funnel-ID, X-Idempotency-Key",
};

const JsonRecordSchema = z
  .record(z.string().max(200), z.unknown())
  .refine((record) => Object.keys(record).length <= 250, {
    message: "Record contains too many fields",
  });
const shortText = z.string().trim().max(200);
const pageText = z.string().trim().max(2_048);

const UtmSchema = z
  .object({
    source: shortText.optional(),
    medium: shortText.optional(),
    campaign: shortText.optional(),
    term: shortText.optional(),
    content: shortText.optional(),
    timestamp: z.number().optional(),
  })
  .passthrough();

const TrackingSchema = z
  .object({
    page: z
      .object({
        url: pageText.optional(),
        path: pageText.optional(),
        title: pageText.optional(),
        referrer: pageText.optional(),
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
        userId: shortText.optional(),
        anonymousId: shortText.optional(),
      })
      .passthrough()
      .optional(),
    session: z
      .object({
        sessionId: shortText.optional(),
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
  eventName: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_.:-]+$/)
    .default("form_submitted"),
  trackEvent: z.boolean().default(true),
  form: z.object({
    id: shortText.optional(),
    key: z.string().trim().min(1).max(200),
    name: shortText.optional(),
    type: shortText.optional(),
    version: shortText.optional(),
  }),
  submission: z.object({
    status: shortText.default("submitted"),
    qualified: z.boolean().optional(),
    score: z.number().optional(),
    reasonCodes: z.array(shortText).max(50).default([]),
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

    await enforceFunnelRequestQuota({
      action: "EXTERNAL_FORM_SUBMISSION",
      globalLimit: 1_000,
      request: req,
      organizationId: funnel.organizationId,
      funnelId: funnel.id,
      subjectLimit: 20,
    });
    const rawBody = await readBoundedRawBody(req, MAX_EXTERNAL_FORM_BODY_BYTES);
    const payloadHash = createHash("sha256").update(rawBody).digest("hex");
    const parsed = CustomFormSubmitSchema.parse(JSON.parse(rawBody));
    const trackingAllowed =
      req.headers.get("sec-gpc") !== "1" && req.headers.get("dnt") !== "1";
    const tracking = trackingAllowed ? parsed.tracking : undefined;
    const rawIdempotencyKey = req.headers.get("x-idempotency-key")?.trim();
    if (
      rawIdempotencyKey &&
      (rawIdempotencyKey.length < 16 || rawIdempotencyKey.length > 128)
    ) {
      return NextResponse.json(
        { error: "Idempotency key must contain 16 to 128 characters" },
        { status: 400, headers: corsHeaders },
      );
    }
    const idempotencyKey = rawIdempotencyKey || null;
    const normalized = parsed.submission.normalized;
    const submissionId = crypto.randomUUID();
    const submittedAt = parsed.submission.submittedAt
      ? new Date(parsed.submission.submittedAt)
      : new Date();
    if (!externalTelemetryTimesAreCurrent([submittedAt.getTime()])) {
      return NextResponse.json(
        { error: "Submission time is outside the accepted window" },
        { status: 400, headers: corsHeaders },
      );
    }
    const userAgent = trackingAllowed
      ? req.headers.get("user-agent") ||
        (typeof tracking?.device?.userAgent === "string"
          ? tracking.device.userAgent
          : undefined)
      : undefined;

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

    const ipAddress = trackingAllowed
      ? getPrivacyCompliantIp(getIpAddress(req), {
          anonymizeIp,
          hashIp,
        })
      : null;

    const crmFormId = parsed.form.id ?? null;
    let crmResolutionConfig: unknown = null;

    if (crmFormId) {
      const crmForm = await db.query.form.findFirst({
        where: and(
          eq(formTable.id, crmFormId),
          eq(formTable.organizationId, funnel.organizationId),
          funnel.locationId
            ? eq(formTable.locationId, funnel.locationId)
            : isNull(formTable.locationId),
        ),
        columns: {
          id: true,
          crmResolutionConfig: true,
        },
      });

      if (!crmForm) {
        return NextResponse.json(
          { error: "Form ID does not belong to this external funnel" },
          { status: 400, headers: corsHeaders },
        );
      }
      crmResolutionConfig = crmForm.crmResolutionConfig;
    }

    const mirroredFormSubmissionId = crmFormId ? crypto.randomUUID() : null;

    const persisted = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(externalFormSubmission)
        .values({
          id: submissionId,
          mirroredFormSubmissionId: null,
          idempotencyKey,
          payloadHash,
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
        })
        .onConflictDoNothing()
        .returning({ id: externalFormSubmission.id });

      if (!created) {
        const [existing] = idempotencyKey
          ? await tx
              .select({
                id: externalFormSubmission.id,
                mirroredFormSubmissionId:
                  externalFormSubmission.mirroredFormSubmissionId,
                payloadHash: externalFormSubmission.payloadHash,
              })
              .from(externalFormSubmission)
              .where(
                and(
                  eq(externalFormSubmission.funnelId, funnel.id),
                  eq(externalFormSubmission.idempotencyKey, idempotencyKey),
                ),
              )
              .limit(1)
          : [];
        if (!existing) {
          throw new Error("External form submission could not be persisted.");
        }
        if (existing.payloadHash !== payloadHash) {
          throw new IdempotencyConflictError();
        }
        return {
          duplicate: true as const,
          submissionId: existing.id,
          mirroredFormSubmissionId: existing.mirroredFormSubmissionId,
        };
      }

      if (crmFormId && mirroredFormSubmissionId) {
        await tx.insert(formSubmission).values({
          id: mirroredFormSubmissionId,
          formId: crmFormId,
          organizationId: funnel.organizationId,
          locationId: funnel.locationId,
          data: parsed.submission.data,
          crmResolutionConfig,
          clientResolutionStatus: formCrmResolutionIsEnabled(
            crmResolutionConfig,
          )
            ? "PENDING"
            : "NOT_CONFIGURED",
          utmSource: tracking?.utm?.source,
          utmMedium: tracking?.utm?.medium,
          utmCampaign: tracking?.utm?.campaign,
          utmTerm: tracking?.utm?.term,
          utmContent: tracking?.utm?.content,
          ipAddress,
          userAgent,
          referrer: tracking?.page?.referrer,
          triggerDispatchStatus: "PENDING",
          submittedAt,
        });
        await tx
          .update(externalFormSubmission)
          .set({ mirroredFormSubmissionId })
          .where(eq(externalFormSubmission.id, created.id));
      }
      return {
        duplicate: false as const,
        submissionId: created.id,
        mirroredFormSubmissionId,
      };
    });

    if (parsed.trackEvent && trackingAllowed) {
      const sessionId =
        tracking?.session?.sessionId ?? `server-form-${persisted.submissionId}`;

      await inngest.send({
        name: "tracking/events.batch",
        data: {
          funnelId: funnel.id,
          locationId: funnel.locationId,
          organizationId: funnel.organizationId,
          ipAddress,
          trustLevel: "TELEMETRY",
          events: [
            {
              eventId: `form_${persisted.submissionId}`,
              eventName: "external_form_submitted",
              properties: {
                conversionType: "lead",
                formKey: parsed.form.key,
                formName: parsed.form.name,
                formType: parsed.form.type,
                formVersion: parsed.form.version,
                submissionId: persisted.submissionId,
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

    if (persisted.mirroredFormSubmissionId) {
      try {
        await requestFormSubmittedWorkflowDispatch(
          persisted.mirroredFormSubmissionId,
        );
      } catch {
        // The pending submission is recovered by the scheduled dispatcher.
      }
    }

    return NextResponse.json(
      {
        success: true,
        duplicate: persisted.duplicate,
        submissionId: persisted.submissionId,
        mirroredFormSubmissionId: persisted.mirroredFormSubmissionId,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("[External forms API] Error submitting custom form:", error);

    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "Invalid request format",
          details: error instanceof z.ZodError ? error.issues : undefined,
        },
        { status: 400, headers: corsHeaders },
      );
    }

    if (error instanceof WebhookPayloadTooLargeError) {
      return NextResponse.json(
        { error: "Request body is too large" },
        { status: 413, headers: corsHeaders },
      );
    }
    if (error instanceof FunnelTelemetryQuotaExceededError) {
      return NextResponse.json(
        { error: "Too many form submissions" },
        { status: 429, headers: corsHeaders },
      );
    }
    if (error instanceof FunnelTelemetryQuotaUnavailableError) {
      return NextResponse.json(
        { error: "Form submission protection is unavailable" },
        { status: 503, headers: corsHeaders },
      );
    }
    if (error instanceof IdempotencyConflictError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409, headers: corsHeaders },
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
