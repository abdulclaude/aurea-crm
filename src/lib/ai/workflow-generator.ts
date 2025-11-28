import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "@/lib/db";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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
      type: "STRIPE_TRIGGER",
      name: "Stripe Trigger",
      description: "Triggered by Stripe payment events",
    },
    {
      type: "CONTACT_CREATED_TRIGGER",
      name: "Contact Created Trigger",
      description: "Triggered when a new contact is created",
    },
    {
      type: "CONTACT_UPDATED_TRIGGER",
      name: "Contact Updated Trigger",
      description: "Triggered when a contact is updated",
    },
    {
      type: "CONTACT_DELETED_TRIGGER",
      name: "Contact Deleted Trigger",
      description: "Triggered when a contact is deleted",
    },
    {
      type: "CONTACT_FIELD_CHANGED_TRIGGER",
      name: "Contact Field Changed Trigger",
      description: "Triggered when a specific contact field changes",
    },
    {
      type: "CONTACT_TYPE_CHANGED_TRIGGER",
      name: "Contact Type Changed Trigger",
      description: "Triggered when contact type changes (Lead, Customer, etc.)",
    },
    {
      type: "CONTACT_LIFECYCLE_STAGE_CHANGED_TRIGGER",
      name: "Contact Lifecycle Stage Changed Trigger",
      description: "Triggered when contact lifecycle stage changes",
    },
  ],
  executions: [
    {
      type: "HTTP_REQUEST",
      name: "HTTP Request",
      description: "Make HTTP API calls to external services",
    },
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
      type: "CREATE_CONTACT",
      name: "Create Contact",
      description: "Create a new contact in CRM",
    },
    {
      type: "UPDATE_CONTACT",
      name: "Update Contact",
      description: "Update an existing contact",
    },
    {
      type: "DELETE_CONTACT",
      name: "Delete Contact",
      description: "Delete a contact",
    },
    {
      type: "CREATE_DEAL",
      name: "Create Deal",
      description: "Create a new deal in pipeline",
    },
    {
      type: "UPDATE_DEAL",
      name: "Update Deal",
      description: "Update an existing deal",
    },
    { type: "DELETE_DEAL", name: "Delete Deal", description: "Delete a deal" },
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

export interface GeneratedWorkflow {
  name: string;
  description: string;
  nodes: Array<{
    id: string;
    name: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, any>;
  }>;
  connections: Array<{
    sourceId: string;
    targetId: string;
  }>;
}

export async function generateWorkflow(
  description: string,
  context: {
    organizationId: string;
    subaccountId: string | null;
  }
): Promise<GeneratedWorkflow | null> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Fetch existing pipelines for context
  const pipelines = await prisma.pipeline.findMany({
    where: {
      organizationId: context.organizationId,
      subaccountId: context.subaccountId,
    },
    include: { stages: { orderBy: { position: "asc" } } },
    take: 5,
  });

  const pipelineContext =
    pipelines.length > 0
      ? `\nExisting pipelines:\n${pipelines
          .map(
            (p) =>
              `- ${p.name} (stages: ${p.stages.map((s) => s.name).join(" → ")})`
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
For application intake, consider using GOOGLE_FORM_TRIGGER or CONTACT_CREATED_TRIGGER.

JSON:`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const workflow = JSON.parse(jsonMatch[0]) as GeneratedWorkflow;

      // Validate the workflow structure
      if (!workflow.name || !workflow.nodes || !workflow.connections) {
        return null;
      }

      // Ensure at least one trigger node
      const hasTrigger = workflow.nodes.some((n) =>
        nodeDefinitions.triggers.some((t) => t.type === n.type)
      );

      if (!hasTrigger) {
        return null;
      }

      return workflow;
    }
  } catch (error) {
    console.error("Failed to generate workflow:", error);
  }

  return null;
}

export async function generateBundleWorkflow(
  description: string,
  context: {
    organizationId: string;
    subaccountId: string | null;
  }
): Promise<GeneratedWorkflow | null> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Fetch existing pipelines for context
  const pipelines = await prisma.pipeline.findMany({
    where: {
      organizationId: context.organizationId,
      subaccountId: context.subaccountId,
    },
    include: { stages: { orderBy: { position: "asc" } } },
    take: 5,
  });

  const pipelineContext =
    pipelines.length > 0
      ? `\nExisting pipelines:\n${pipelines
          .map(
            (p) =>
              `- ${p.name} (stages: ${p.stages.map((s) => s.name).join(" → ")})`
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
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const workflow = JSON.parse(jsonMatch[0]) as GeneratedWorkflow;

      // Validate the workflow structure
      if (!workflow.name || !workflow.nodes || !workflow.connections) {
        return null;
      }

      // Ensure NO trigger nodes (bundles shouldn't have triggers)
      const hasTrigger = workflow.nodes.some((n) =>
        nodeDefinitions.triggers.some((t) => t.type === n.type)
      );

      if (hasTrigger) {
        console.error("Bundle workflow should not contain triggers");
        return null;
      }

      // Ensure at least one execution node
      if (workflow.nodes.length === 0) {
        return null;
      }

      return workflow;
    }
  } catch (error) {
    console.error("Failed to generate bundle workflow:", error);
  }

  return null;
}
