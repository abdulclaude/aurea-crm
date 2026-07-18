import { GoogleGenerativeAI } from "@google/generative-ai";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { pipeline as pipelineTable, pipelineStage } from "@/db/schema";
import {
  parseGeneratedWorkflow,
  type GeneratedWorkflow,
} from "./workflow-contract";

export type { GeneratedWorkflow } from "./workflow-contract";

// Node definitions with descriptions for AI
const nodeDefinitions = {
  triggers: [
    {
      type: "MANUAL_TRIGGER",
      name: "Manual Trigger",
      description: "Manually start the workflow",
    },
    {
      type: "GOOGLE_FORM_TRIGGER",
      name: "Google Form Trigger",
      description: "Triggered when a Google Form is submitted",
    },
    {
      type: "GOOGLE_CALENDAR_TRIGGER",
      name: "Google Calendar Trigger",
      description: "Triggered by calendar events (created, updated, deleted)",
    },
    {
      type: "GMAIL_TRIGGER",
      name: "Gmail Trigger",
      description: "Triggered when receiving emails matching criteria",
    },
    {
      type: "TELEGRAM_TRIGGER",
      name: "Telegram Trigger",
      description: "Triggered by Telegram bot messages",
    },
    {
      type: "STRIPE_PAYMENT_SUCCEEDED",
      name: "Stripe Payment Succeeded",
      description: "Triggered when a verified Stripe payment succeeds",
    },
    {
      type: "STRIPE_PAYMENT_FAILED",
      name: "Stripe Payment Failed",
      description: "Triggered when a verified Stripe payment fails",
    },
    {
      type: "STRIPE_SUBSCRIPTION_CREATED",
      name: "Stripe Subscription Created",
      description: "Triggered when Stripe creates a subscription",
    },
    {
      type: "STRIPE_SUBSCRIPTION_UPDATED",
      name: "Stripe Subscription Updated",
      description: "Triggered when Stripe updates a subscription",
    },
    {
      type: "STRIPE_SUBSCRIPTION_CANCELLED",
      name: "Stripe Subscription Cancelled",
      description: "Triggered when Stripe cancels a subscription",
    },
    {
      type: "CLIENT_CREATED_TRIGGER",
      name: "Client Created Trigger",
      description: "Triggered when a new client is created",
    },
    {
      type: "CLIENT_UPDATED_TRIGGER",
      name: "Client Updated Trigger",
      description: "Triggered when a client is updated",
    },
    {
      type: "CLIENT_DELETED_TRIGGER",
      name: "Client Deleted Trigger",
      description: "Triggered when a client is deleted",
    },
    {
      type: "CLIENT_FIELD_CHANGED_TRIGGER",
      name: "Client Field Changed Trigger",
      description: "Triggered when a specific client field changes",
    },
    {
      type: "CLIENT_TYPE_CHANGED_TRIGGER",
      name: "Client Type Changed Trigger",
      description: "Triggered when client type changes (Lead, Customer, etc.)",
    },
    {
      type: "CLIENT_LIFECYCLE_STAGE_CHANGED_TRIGGER",
      name: "Client Lifecycle Stage Changed Trigger",
      description: "Triggered when client lifecycle stage changes",
    },
  ],
  executions: [
    {
      type: "GEMINI",
      name: "Gemini AI",
      description: "Process data with Google Gemini AI",
    },
    {
      type: "GMAIL_EXECUTION",
      name: "Send Gmail",
      description: "Send emails via Gmail",
    },
    {
      type: "GOOGLE_CALENDAR_EXECUTION",
      name: "Google Calendar",
      description: "Create/update calendar events",
    },
    {
      type: "TELEGRAM_EXECUTION",
      name: "Send Telegram",
      description: "Send Telegram messages",
    },
    {
      type: "DISCORD",
      name: "Discord",
      description: "Send Discord messages/webhooks",
    },
    { type: "SLACK", name: "Slack", description: "Send Slack messages" },
    {
      type: "WAIT",
      name: "Wait/Delay",
      description: "Wait for a specified duration before continuing",
    },
    {
      type: "CREATE_CLIENT",
      name: "Create Client",
      description: "Create a new client in CRM",
    },
    {
      type: "UPDATE_CLIENT",
      name: "Update Client",
      description: "Update an existing client",
    },
    {
      type: "CREATE_DEAL",
      name: "Create deal",
      description: "Create a new deal in pipeline",
    },
    {
      type: "UPDATE_DEAL",
      name: "Update Deal",
      description: "Update an existing deal",
    },
    {
      type: "UPDATE_PIPELINE",
      name: "Update Pipeline",
      description: "Move deal to different pipeline stage",
    },
    {
      type: "IF_ELSE",
      name: "If/Else Condition",
      description: "Branch workflow based on conditions",
    },
    {
      type: "SWITCH",
      name: "Switch",
      description: "Multiple branch conditions",
    },
    { type: "LOOP", name: "Loop", description: "Iterate over a list of items" },
    {
      type: "SET_VARIABLE",
      name: "Set Variable",
      description: "Store data in workflow variables",
    },
    {
      type: "STOP_WORKFLOW",
      name: "Stop Workflow",
      description: "End workflow execution",
    },
    {
      type: "BUNDLE_WORKFLOW",
      name: "Run Bundle Workflow",
      description: "Execute another workflow as a sub-workflow",
    },
  ],
};

export async function generateWorkflow(
  description: string,
  context: {
    organizationId: string;
    locationId: string | null;
    geminiApiKey: string;
  },
): Promise<GeneratedWorkflow | null> {
  const model = new GoogleGenerativeAI(context.geminiApiKey).getGenerativeModel({
    model: "gemini-2.0-flash",
  });

  // Fetch existing pipelines for context
  const pipelines = await getPipelinePromptContext(context);

  const pipelineContext =
    pipelines.length > 0
      ? `\nExisting pipelines:\n${pipelines
          .map(
            (pipeline) =>
              `- ${pipeline.name} (stages: ${pipeline.pipelineStages.map((stage) => stage.name).join(" -> ")})`,
          )
          .join("\n")}`
      : "";

  const triggerList = nodeDefinitions.triggers
    .map((n) => `- ${n.type}: ${n.description}`)
    .join("\n");

  const executionList = nodeDefinitions.executions
    .map((n) => `- ${n.type}: ${n.description}`)
    .join("\n");

  const prompt = `Generate a workflow automation based on this description. Return ONLY valid JSON.

User request: "${description}"

Available TRIGGER nodes (workflows must start with exactly ONE trigger):
${triggerList}

Available EXECUTION nodes:
${executionList}
${pipelineContext}

Generate a workflow with:
1. A descriptive name
2. A brief description
3. Nodes array with unique IDs (use format: node_1, node_2, etc.)
4. Connections array linking nodes in order

Return JSON in this exact format:
{
  "name": "Workflow Name",
  "description": "What this workflow does",
  "nodes": [
    {
      "id": "node_1",
      "name": "Trigger Name",
      "type": "TRIGGER_TYPE",
      "position": { "x": 0, "y": 0 },
      "data": {}
    },
    {
      "id": "node_2",
      "name": "Action Name",
      "type": "EXECUTION_TYPE",
      "position": { "x": 150, "y": 0 },
      "data": {}
    }
  ],
  "connections": [
    { "sourceId": "node_1", "targetId": "node_2" }
  ]
}

Position nodes horizontally (increment x by 150 for each node, keep y at 0).
Only use node types from the lists above.
For application intake, consider using GOOGLE_FORM_TRIGGER or CLIENT_CREATED_TRIGGER.

JSON:`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return parseGeneratedWorkflow({
      text,
      mode: "workflow",
      triggerDefinitions: nodeDefinitions.triggers,
      executionDefinitions: nodeDefinitions.executions,
    });
  } catch (error) {
    console.error("Failed to generate workflow:", error);
  }

  return null;
}

export async function generateBundleWorkflow(
  description: string,
  context: {
    organizationId: string;
    locationId: string | null;
    geminiApiKey: string;
  },
): Promise<GeneratedWorkflow | null> {
  const model = new GoogleGenerativeAI(context.geminiApiKey).getGenerativeModel({
    model: "gemini-2.0-flash",
  });

  const pipelines = await getPipelinePromptContext(context);

  const pipelineContext =
    pipelines.length > 0
      ? `\nExisting pipelines:\n${pipelines
          .map(
            (pipeline) =>
              `- ${pipeline.name} (stages: ${pipeline.pipelineStages.map((stage) => stage.name).join(" -> ")})`,
          )
          .join("\n")}`
      : "";

  const executionList = nodeDefinitions.executions
    .map((n) => `- ${n.type}: ${n.description}`)
    .join("\n");

  const prompt = `Generate a bundle workflow (reusable sub-workflow) based on this description. Return ONLY valid JSON.

A bundle workflow is a reusable set of actions that can be inserted into other workflows. It does NOT have a trigger - it starts with execution nodes only.

User request: "${description}"

Available EXECUTION nodes (bundles only use execution nodes, NO triggers):
${executionList}
${pipelineContext}

Generate a bundle workflow with:
1. A descriptive name
2. A brief description of what this reusable bundle does
3. Nodes array with unique IDs (use format: node_1, node_2, etc.)
4. Connections array linking nodes in order

Return JSON in this exact format:
{
  "name": "Bundle Name",
  "description": "What this reusable bundle does",
  "nodes": [
    {
      "id": "node_1",
      "name": "First Action",
      "type": "EXECUTION_TYPE",
      "position": { "x": 0, "y": 0 },
      "data": {}
    },
    {
      "id": "node_2",
      "name": "Second Action",
      "type": "EXECUTION_TYPE",
      "position": { "x": 150, "y": 0 },
      "data": {}
    }
  ],
  "connections": [
    { "sourceId": "node_1", "targetId": "node_2" }
  ]
}

Position nodes horizontally (increment x by 150 for each node, keep y at 0).
Only use EXECUTION node types from the list above - NO triggers.
Common bundle patterns: data transformation, notification sequences, CRM updates.

JSON:`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return parseGeneratedWorkflow({
      text,
      mode: "bundle",
      triggerDefinitions: nodeDefinitions.triggers,
      executionDefinitions: nodeDefinitions.executions,
    });
  } catch (error) {
    console.error("Failed to generate bundle workflow:", error);
  }

  return null;
}

function getPipelinePromptContext(context: {
  organizationId: string;
  locationId: string | null;
}) {
  return db.query.pipeline.findMany({
    where: and(
      eq(pipelineTable.organizationId, context.organizationId),
      context.locationId ? eq(pipelineTable.locationId, context.locationId) : isNull(pipelineTable.locationId)
    ),
    with: {
      pipelineStages: {
        orderBy: [asc(pipelineStage.position)],
      },
    },
    limit: 5,
  });
}
