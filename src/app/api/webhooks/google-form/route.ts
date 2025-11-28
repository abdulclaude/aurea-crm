import { sendWorkflowExecution } from "@/inngest/utils";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { NodeType } from "@prisma/client";

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

    const body = await request.json();

    const formData = {
      formId: body.formId,
      formTitle: body.formTitle,
      responseId: body.responseId,
      timestamp: body.timestamp,
      respondentEmail: body.respondentEmail,
      responses: body.responses,
      raw: body,
    };

    // Fetch the Google Form trigger node to get the variable name
    const triggerNode = await prisma.node.findFirst({
      where: {
        workflowId,
        type: NodeType.GOOGLE_FORM_TRIGGER,
      },
      select: {
        data: true,
      },
    });

    // Extract variable name from node data, default to "googleForm" if not found
    const nodeData = triggerNode?.data as { variableName?: string } | null;
    const variableName = nodeData?.variableName || "googleForm";

    // trigger an inngest job

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
