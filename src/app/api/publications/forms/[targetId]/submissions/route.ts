import { NextResponse } from "next/server";

import { z } from "zod";

import { inngest } from "@/inngest/client";
import { publicationConsentCookieName } from "@/features/publications/public/consent";
import {
  MAX_PUBLIC_FORM_BODY_BYTES,
  publicFormIdempotencyKeySchema,
  publicFormSubmissionBodySchema,
  requestIsSameOrigin,
} from "@/features/publications/public/form-submission-contract";
import { verifyPublicFormSubmissionToken } from "@/features/publications/public/form-submission-token";
import {
  acceptPublicFormSubmission,
  PublicFormSubmissionConflictError,
  PublicFormSubmissionStaleError,
  PublicFormSubmissionValidationError,
} from "@/features/publications/server/form-submission-service";
import { getPublishedFormSubmissionSource } from "@/features/publications/server/form-submission-source";
import {
  enforcePublicationRequestQuota,
  PUBLIC_FORM_SUBMISSION_QUOTA,
  PublicationQuotaExceededError,
  PublicationQuotaUnavailableError,
} from "@/features/publications/server/publication-request-quota";
import {
  readBoundedRawBody,
  WebhookPayloadTooLargeError,
} from "@/features/webhooks/server/bounded-raw-body";
import { requestFormSubmittedWorkflowDispatch } from "@/features/workflows/server/form-submitted-trigger-service";

type RouteContext = { params: Promise<{ targetId: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!requestIsSameOrigin(request)) {
    return errorResponse("This form request is not allowed.", 403);
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return errorResponse("The form request must use JSON.", 415);
  }

  try {
    const { targetId } = await context.params;
    const idempotencyKey = publicFormIdempotencyKeySchema.parse(
      request.headers.get("idempotency-key"),
    );
    const body = publicFormSubmissionBodySchema.parse(
      JSON.parse(await readBoundedRawBody(request, MAX_PUBLIC_FORM_BODY_BYTES)),
    );
    if (body.website) {
      return NextResponse.json({ accepted: true }, { status: 202 });
    }
    const token = verifyPublicFormSubmissionToken(body.token);
    if (
      !token ||
      token.targetId !== targetId ||
      token.versionId !== body.versionId
    ) {
      return errorResponse("The form session is invalid or expired.", 401);
    }
    const source = await getPublishedFormSubmissionSource({
      targetId,
      versionId: token.versionId,
      formId: token.formId,
    });
    if (!source) {
      return errorResponse("This published form is no longer available.", 409);
    }
    await enforcePublicationRequestQuota({
      request,
      organizationId: source.organizationId,
      targetId,
      policy: PUBLIC_FORM_SUBMISSION_QUOTA,
    });
    const cookieValue = readCookie(
      request.headers.get("cookie"),
      publicationConsentCookieName(targetId),
    );
    const accepted = await acceptPublicFormSubmission({
      targetId,
      versionId: token.versionId,
      organizationId: source.organizationId,
      locationId: source.locationId,
      formId: token.formId,
      source: source.source,
      values: body.values,
      idempotencyKey,
      submissionToken: body.token,
      consentPolicy: source.consent,
      responseConsentLabel: source.channel.responseConsentLabel,
      responseRetentionDays: source.channel.responseRetentionDays,
      trackingConsentCookie: cookieValue,
      globalPrivacyControl: request.headers.get("sec-gpc") === "1",
    });
    if (accepted.workflowPending) {
      try {
        await inngest.send({
          name: "publications/form.submission.accepted",
          id: `public-form-submission:${accepted.receiptId}`,
          data: { receiptId: accepted.receiptId },
        });
      } catch {
        // The durable PENDING receipt is recovered by the scheduled dispatcher.
      }
    }
    try {
      await requestFormSubmittedWorkflowDispatch(accepted.submissionId);
    } catch {
      // The pending submission is recovered by the scheduled dispatcher.
    }
    return NextResponse.json(
      {
        accepted: true,
        submissionId: accepted.submissionId,
        replayed: accepted.replayed,
      },
      { status: accepted.replayed ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof WebhookPayloadTooLargeError) {
      return errorResponse("The form response is too large.", 413);
    }
    if (error instanceof PublicationQuotaExceededError) {
      return NextResponse.json(
        { error: "Too many responses were attempted. Try again later." },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(error.retryAfterSeconds),
          },
        },
      );
    }
    if (error instanceof PublicationQuotaUnavailableError) {
      return errorResponse("The response cannot be accepted right now.", 503);
    }
    if (error instanceof PublicFormSubmissionValidationError) {
      return NextResponse.json(
        {
          error: "Check the highlighted form fields.",
          fieldErrors: error.fieldErrors,
          formErrors: error.formErrors,
        },
        { status: 422 },
      );
    }
    if (
      error instanceof PublicFormSubmissionConflictError ||
      error instanceof PublicFormSubmissionStaleError
    ) {
      return errorResponse(error.message, 409);
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return errorResponse("The form request is invalid.", 400);
    }
    return errorResponse("The response could not be saved. Try again.", 503);
  }
}

function readCookie(
  cookieHeader: string | null,
  name: string,
): string | undefined {
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

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
