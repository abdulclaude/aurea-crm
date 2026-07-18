import { sendWorkflowExecution } from "@/inngest/utils";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { NodeType } from "@/db/enums";
import { node as nodeTable, workflows } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { ZodError } from "zod";
import {
  googleFormPayloadSchema,
  googleFormTriggerConfigSchema,
  googleFormWebhookEventId,
  googleFormWebhookSecretMatches,
} from "@/features/google-forms/server/webhook-contract";
import {
  readBoundedRawBody,
  WebhookPayloadTooLargeError,
} from "@/features/webhooks/server/bounded-raw-body";

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const workflowId = url.searchParams.get("workflowId");
    const token = request.headers.get("x-aurea-webhook-token");

    if (!workflowId || !token) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required webhook credentials.",
        },
        { status: 400 },
      );
    }

    const [triggerNode] = await db
      .select({
        data: nodeTable.data,
        archived: workflows.archived,
        isTemplate: workflows.isTemplate,
        organizationId: workflows.organizationId,
        locationId: workflows.locationId,
      })
      .from(nodeTable)
      .innerJoin(workflows, eq(workflows.id, nodeTable.workflowId))
      .where(
        and(
          eq(nodeTable.workflowId, workflowId),
          eq(nodeTable.type, NodeType.GOOGLE_FORM_TRIGGER),
        ),
      )
      .limit(1);
    if (!triggerNode || !triggerNode.organizationId) {
      return NextResponse.json(
        { success: false, error: "Webhook not found." },
        { status: 404 },
      );
    }
    if (triggerNode.archived || triggerNode.isTemplate) {
      return NextResponse.json(
        { success: false, error: "Webhook is inactive." },
        { status: 409 },
      );
    }
    const parsedConfig = googleFormTriggerConfigSchema.safeParse(
      triggerNode.data,
    );
    if (!parsedConfig.success) {
      return NextResponse.json(
        { success: false, error: "Webhook is inactive." },
        { status: 409 },
      );
    }
    const config = parsedConfig.data;
    if (!googleFormWebhookSecretMatches(token, config.webhookSecret)) {
      return NextResponse.json(
        { success: false, error: "Invalid webhook credentials." },
        { status: 401 },
      );
    }

    const rawBody = await readBoundedRawBody(request);
    const body = googleFormPayloadSchema.parse(JSON.parse(rawBody) as unknown);

    const formData = {
      formId: body.formId,
      formTitle: body.formTitle,
      responseId: body.responseId,
      timestamp: body.timestamp,
      respondentEmail: body.respondentEmail,
      responses: body.responses,
      raw: body,
    };

    await sendWorkflowExecution({
      workflowId,
      initialData: {
        [config.variableName]: formData,
      },
      expectedOrganizationId: triggerNode.organizationId,
      expectedLocationId: triggerNode.locationId,
      idempotencyKey: googleFormWebhookEventId(workflowId, rawBody),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof WebhookPayloadTooLargeError) {
      return NextResponse.json(
        { success: false, error: "Webhook payload is too large." },
        { status: 413 },
      );
    }
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: "Invalid webhook payload." },
        { status: 400 },
      );
    }
    console.error("Google Form webhook processing failed.");
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process Google Form submission.",
      },
      { status: 500 },
    );
  }
}
