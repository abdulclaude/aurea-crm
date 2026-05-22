import { sendWorkflowExecution } from "@/inngest/utils";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { NodeType } from "@/db/enums";
import { node as nodeTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const GoogleFormPayloadSchema = z
  .object({
    formId: z.unknown().optional(),
    formTitle: z.unknown().optional(),
    responseId: z.unknown().optional(),
    timestamp: z.unknown().optional(),
    respondentEmail: z.unknown().optional(),
    responses: z.unknown().optional(),
  })
  .passthrough();

function getVariableName(data: unknown): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "googleForm";
  }

  const record = data as Record<string, unknown>;
  return typeof record.variableName === "string"
    ? record.variableName
    : "googleForm";
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const workflowId = url.searchParams.get("workflowId");

    if (!workflowId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required query parameter: workflowId",
        },
        { status: 400 }
      );
    }

    const rawBody: unknown = await request.json();
    const body = GoogleFormPayloadSchema.parse(rawBody);

    const formData = {
      formId: body.formId,
      formTitle: body.formTitle,
      responseId: body.responseId,
      timestamp: body.timestamp,
      respondentEmail: body.respondentEmail,
      responses: body.responses,
      raw: body,
    };

    const [triggerNode] = await db
      .select({ data: nodeTable.data })
      .from(nodeTable)
      .where(
        and(
          eq(nodeTable.workflowId, workflowId),
          eq(nodeTable.type, NodeType.GOOGLE_FORM_TRIGGER)
        )
      )
      .limit(1);

    const variableName = getVariableName(triggerNode?.data);

    await sendWorkflowExecution({
      workflowId,
      initialData: {
        [variableName]: formData,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Google form webhook error: ", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process Google Form submission.",
      },
      { status: 500 }
    );
  }
}
