import { db } from "@/db";
import { NodeType } from "@/db/enums";
import {
  client,
  clientAssignee,
  connection,
  deal,
  dealAssignee,
  dealClient,
  locationMember,
  pipeline,
  pipelineStage,
  node as workflowNode,
  workflows,
} from "@/db/schema";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lt, lte, type SQL } from "drizzle-orm";
import type { RouteResult } from "./intent-router";
import {
  parseClientArgs,
  parseDealArgs,
  parsePipelineArgs,
  getMissingFields,
  formatFieldName,
} from "./argument-parser";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateWorkflow, generateBundleWorkflow, type GeneratedWorkflow } from "./workflow-generator";
import { polarClient } from "@/lib/polar";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const textParam = (value: unknown): string => (typeof value === "string" ? value : "");

const stringArrayParam = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const optionalLocationCondition = (
  column: typeof client.locationId | typeof deal.locationId | typeof pipeline.locationId | typeof workflows.locationId,
  locationId: string | null
): SQL | undefined => (locationId ? eq(column, locationId) : undefined);

const strictLocationCondition = (
  column: typeof client.locationId | typeof deal.locationId | typeof pipeline.locationId | typeof workflows.locationId,
  locationId: string | null
): SQL => (locationId ? eq(column, locationId) : isNull(column));

const compactConditions = (conditions: Array<SQL | undefined>): SQL | undefined => {
  const defined = conditions.filter((condition): condition is SQL => condition !== undefined);
  return defined.length > 0 ? and(...defined) : undefined;
};

async function findLocationMemberByUserName(locationId: string, name: string): Promise<string | undefined> {
  const members = await db.query.locationMember.findMany({
    where: eq(locationMember.locationId, locationId),
    with: {
      user: true,
    },
  });

  const search = name.toLowerCase();
  return members.find((member) => member.user.name.toLowerCase().includes(search))?.id;
}

async function persistGeneratedWorkflow({
  workflow,
  context,
  isBundle = false,
}: {
  workflow: GeneratedWorkflow;
  context: ActionContext & { organizationId: string };
  isBundle?: boolean;
}): Promise<typeof workflows.$inferSelect & { Node: Array<typeof workflowNode.$inferSelect> }> {
  return await db.transaction(async (tx) => {
    const [createdWorkflow] = await tx
      .insert(workflows)
      .values({
        id: crypto.randomUUID(),
        userId: context.userId,
        organizationId: context.organizationId,
        locationId: context.locationId,
        name: workflow.name,
        description: workflow.description,
        isBundle,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const createdNodes =
      workflow.nodes.length > 0
        ? await tx
            .insert(workflowNode)
            .values(
              workflow.nodes.map((node) => ({
                id: crypto.randomUUID(),
                workflowId: createdWorkflow.id,
                name: node.name,
                type: node.type as NodeType,
                position: node.position,
                data: node.data,
                createdAt: new Date(),
                updatedAt: new Date(),
              }))
            )
            .returning()
        : [];

    const nodeIdMap = new Map<string, string>();
    for (const generatedNode of workflow.nodes) {
      const createdNode = createdNodes.find(
        (node) => node.name === generatedNode.name && node.type === generatedNode.type
      );
      if (createdNode) {
        nodeIdMap.set(generatedNode.id, createdNode.id);
      }
    }

    const connectionsToInsert = workflow.connections
      .map((workflowConnection) => {
        const fromNodeId = nodeIdMap.get(workflowConnection.sourceId);
        const toNodeId = nodeIdMap.get(workflowConnection.targetId);
        if (!fromNodeId || !toNodeId) return null;

        return {
          id: crypto.randomUUID(),
          workflowId: createdWorkflow.id,
          fromNodeId,
          toNodeId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      })
      .filter((workflowConnection): workflowConnection is NonNullable<typeof workflowConnection> => workflowConnection !== null);

    if (connectionsToInsert.length > 0) {
      await tx.insert(connection).values(connectionsToInsert);
    }

    return { ...createdWorkflow, Node: createdNodes };
  });
}

// Helper to check if user has active subscription
async function hasActiveSubscription(userId: string): Promise<boolean> {
  try {
    const customer = await polarClient.customers.getStateExternal({
      externalId: userId,
    });
    return (
      customer.activeSubscriptions !== undefined &&
      customer.activeSubscriptions.length > 0
    );
  } catch (error) {
    console.error("Failed to check subscription:", error);
    return false;
  }
}

// Extract structured data from natural language using AI
async function extractClientFromNL(message: string): Promise<{
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  tags?: string[];
  assigneeName?: string;
}> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Extract client information from this message. Return ONLY valid JSON with these fields (omit fields if not mentioned):
- name: string (person's full name)
- email: string
- phone: string
- companyName: string (company/organization they work for)
- tags: string[] (array of tags/labels to categorize the client, from phrases like "tag as", "label as", "tags:")
- assigneeName: string (name of team member to assign client to, from phrases like "assign to", "owner", "assigned to")

Message: "${message}"

JSON:`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Failed to extract client from NL:", error);
  }
  return {};
}

async function extractDealFromNL(message: string): Promise<{
  name?: string;
  value?: number;
  currency?: string;
  deadline?: string;
  clientName?: string;
  assigneeName?: string;
  pipelineName?: string;
}> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const today = new Date().toISOString().split("T")[0];

  const prompt = `Extract deal information from this message. Return ONLY valid JSON with these fields (omit fields if not mentioned):
- name: string (deal name/title)
- value: number (deal value without currency symbol)
- currency: string (USD, GBP, EUR, etc. - default to USD)
- deadline: string (ISO date format YYYY-MM-DD, for phrases like "due by", "deadline on", "by date")
- clientName: string (name of client to associate with deal, from phrases like "for client", "assign to client", "link to")
- assigneeName: string (name of team member to assign, from phrases like "assign to", "owner", "assign team member")
- pipelineName: string (name of pipeline to assign deal to, from phrases like "in pipeline", "to pipeline", "for pipeline")

Today's date is ${today}. Parse relative dates like "next week", "in 2 days" accordingly.

Message: "${message}"

JSON:`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Failed to extract deal from NL:", error);
  }
  return {};
}

async function extractPipelineFromNL(message: string): Promise<{
  name?: string;
  description?: string;
}> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Extract pipeline information from this message. Return ONLY valid JSON with these fields (omit fields if not mentioned):
- name: string (pipeline name)
- description: string

Message: "${message}"

JSON:`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Failed to extract pipeline from NL:", error);
  }
  return {};
}

// Extract client query filters from natural language
async function extractClientFiltersFromNL(message: string): Promise<{
  companyName?: string;
  name?: string;
  email?: string;
  createdAfter?: string;
  createdBefore?: string;
  createdOn?: string;
  type?: string;
  lifecycleStage?: string;
}> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const today = new Date().toISOString().split("T")[0];

  const prompt = `Extract client filter criteria from this search query. Return ONLY valid JSON with these fields (omit fields if not mentioned):
- companyName: string (company/organization name to filter by)
- name: string (client name to search for)
- email: string (email to search for)
- createdAfter: string (ISO date format YYYY-MM-DD, for "after", "since", "from" dates)
- createdBefore: string (ISO date format YYYY-MM-DD, for "before", "until" dates)
- createdOn: string (ISO date format YYYY-MM-DD, for specific date like "on November 25th")
- type: string (LEAD, CUSTOMER, PARTNER, VENDOR, OTHER)
- lifecycleStage: string (SUBSCRIBER, LEAD, MQL, SQL, OPPORTUNITY, CUSTOMER, EVANGELIST, OTHER)

Today's date is ${today}. Parse relative dates like "this week", "last month", "yesterday" accordingly.

Message: "${message}"

JSON:`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Failed to extract client filters from NL:", error);
  }
  return {};
}

// Extract deal query filters from natural language
async function extractDealFiltersFromNL(message: string): Promise<{
  minValue?: number;
  maxValue?: number;
  currency?: string;
  pipelineName?: string;
  stageName?: string;
  createdAfter?: string;
  createdBefore?: string;
  createdOn?: string;
  name?: string;
  deadlineBefore?: string;
  deadlineAfter?: string;
  deadlineOn?: string;
  hasPassedDeadline?: boolean;
}> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const today = new Date().toISOString().split("T")[0];

  const prompt = `Extract deal filter criteria from this search query. Return ONLY valid JSON with these fields (omit fields if not mentioned):
- minValue: number (minimum deal value, for "above", "over", "more than", "at least")
- maxValue: number (maximum deal value, for "below", "under", "less than", "at most")
- currency: string (GBP, USD, EUR - infer from symbols like £, $, €)
- pipelineName: string (name of pipeline to filter by)
- stageName: string (name of pipeline stage to filter by)
- createdAfter: string (ISO date format YYYY-MM-DD)
- createdBefore: string (ISO date format YYYY-MM-DD)
- createdOn: string (ISO date format YYYY-MM-DD)
- name: string (deal name to search for)
- deadlineBefore: string (ISO date format YYYY-MM-DD, for deals with deadline before this date)
- deadlineAfter: string (ISO date format YYYY-MM-DD, for deals with deadline after this date)
- deadlineOn: string (ISO date format YYYY-MM-DD, for deals with deadline on specific date)
- hasPassedDeadline: boolean (true for "passed deadline", "overdue", "missed deadline")

Today's date is ${today}. Parse relative dates accordingly.
For currency: £ = GBP, $ = USD, € = EUR
For "passed deadline" or "overdue", set hasPassedDeadline to true.

Message: "${message}"

JSON:`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Failed to extract deal filters from NL:", error);
  }
  return {};
}

export interface ActionContext {
  userId: string;
  organizationId: string | null;
  locationId: string | null;
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
  requiresMoreInfo?: boolean;
  missingFields?: string[];
}

type ActionHandler = (
  params: Record<string, unknown>,
  context: ActionContext
) => Promise<ActionResult>;

const handlers: Record<string, ActionHandler> = {
  // CRM Actions
  createClient: async (params, context) => {
    const organizationId = context.organizationId;
    if (!organizationId) {
      return {
        success: false,
        message: "Please select an organization to create a client.",
        requiresMoreInfo: true,
      };
    }

    const rawMessage = textParam(params.rawMessage);
    const isSlashCommand = rawMessage.startsWith("/");

    // Use regex parser for slash commands, AI for natural language
    const parsed = isSlashCommand
      ? parseClientArgs(rawMessage)
      : await extractClientFromNL(rawMessage);

    const missing = getMissingFields(parsed, ["name"]);

    // If we have at least a name, create the client
    if (parsed.name) {
      const clientName = parsed.name;
      try {
        // Look up team member by name if provided
        let locationMemberId: string | undefined;
        if (parsed.assigneeName && context.locationId) {
          locationMemberId = await findLocationMemberByUserName(context.locationId, parsed.assigneeName);
        }

        const createdClient = await db.transaction(async (tx) => {
          const [newClient] = await tx
            .insert(client)
            .values({
            id: crypto.randomUUID(),
            organizationId,
            locationId: context.locationId || null,
            name: clientName,
            email: parsed.email || null,
            phone: parsed.phone || null,
            companyName: parsed.companyName || null,
            tags: parsed.tags || [],
            type: "LEAD", // Default type
            createdAt: new Date(),
            updatedAt: new Date(),
            })
            .returning();

          if (locationMemberId) {
            await tx.insert(clientAssignee).values({
              id: crypto.randomUUID(),
              clientId: newClient.id,
              locationMemberId,
            });
          }

          return newClient;
        });

        let message = `Created client **${createdClient.name}**`;
        if (createdClient.email) message += ` (${createdClient.email})`;
        if (createdClient.companyName) message += ` at ${createdClient.companyName}`;
        if (parsed.tags && parsed.tags.length > 0) message += ` with tags: ${parsed.tags.join(", ")}`;
        if (locationMemberId) message += ` assigned to team member`;

        return {
          success: true,
          message,
          data: { client: createdClient },
        };
      } catch (error) {
        console.error("Failed to create client:", error);
        return {
          success: false,
          message: "Failed to create client. Please try again.",
        };
      }
    }

    // Need more info
    return {
      success: true,
      message:
        "I can help you create a client. Please provide at least the client's name.\n\nExample: `/create-client John Doe, john@email.com, Acme Corp`",
      requiresMoreInfo: true,
      missingFields: missing.map(formatFieldName),
    };
  },

  createDeal: async (params, context) => {
    const organizationId = context.organizationId;
    if (!organizationId) {
      return {
        success: false,
        message: "Please select an organization to create a deal.",
        requiresMoreInfo: true,
      };
    }

    const rawMessage = textParam(params.rawMessage);
    const isSlashCommand = rawMessage.startsWith("/");

    const parsed = isSlashCommand
      ? parseDealArgs(rawMessage)
      : await extractDealFromNL(rawMessage);

    const missing = getMissingFields(parsed, ["name"]);

    if (parsed.name) {
      const dealName = parsed.name;
      try {
        // Look up pipeline by name if provided, otherwise get default
        let targetPipeline;
        if (parsed.pipelineName) {
          targetPipeline = await db.query.pipeline.findFirst({
            where: and(
              eq(pipeline.organizationId, organizationId),
              strictLocationCondition(pipeline.locationId, context.locationId),
              ilike(pipeline.name, `%${parsed.pipelineName}%`)
            ),
            with: { pipelineStages: { orderBy: asc(pipelineStage.position), limit: 1 } },
          });
        }

        // Fall back to default pipeline if no specific pipeline found or requested
        if (!targetPipeline) {
          targetPipeline = await db.query.pipeline.findFirst({
            where: and(
              eq(pipeline.organizationId, organizationId),
              strictLocationCondition(pipeline.locationId, context.locationId),
              eq(pipeline.isDefault, true)
            ),
            with: { pipelineStages: { orderBy: asc(pipelineStage.position), limit: 1 } },
          });
        }

        // Look up client by name if provided
        let clientId: string | undefined;
        if (parsed.clientName) {
          const existingClient = await db.query.client.findFirst({
            where: and(
              eq(client.organizationId, organizationId),
              strictLocationCondition(client.locationId, context.locationId),
              ilike(client.name, `%${parsed.clientName}%`)
            ),
          });
          clientId = existingClient?.id;
        }

        // Look up team member by name if provided
        let locationMemberId: string | undefined;
        if (parsed.assigneeName && context.locationId) {
          locationMemberId = await findLocationMemberByUserName(context.locationId, parsed.assigneeName);
        }

        const createdDeal = await db.transaction(async (tx) => {
          const [newDeal] = await tx
            .insert(deal)
            .values({
            id: crypto.randomUUID(),
            organizationId,
            locationId: context.locationId || null,
            name: dealName,
            value: parsed.value === undefined ? null : String(parsed.value),
            currency: parsed.currency || "USD",
            deadline: parsed.deadline ? new Date(parsed.deadline) : null,
            pipelineId: targetPipeline?.id || null,
            pipelineStageId: targetPipeline?.pipelineStages[0]?.id || null,
            createdAt: new Date(),
            updatedAt: new Date(),
            })
            .returning();

          if (clientId) {
            await tx.insert(dealClient).values({
              id: crypto.randomUUID(),
              dealId: newDeal.id,
              clientId,
            });
          }

          if (locationMemberId) {
            await tx.insert(dealAssignee).values({
              id: crypto.randomUUID(),
              dealId: newDeal.id,
              locationMemberId,
            });
          }

          return newDeal;
        });

        let message = `Created deal **${createdDeal.name}**`;
        if (createdDeal.value) message += ` worth ${createdDeal.currency} ${createdDeal.value}`;
        if (targetPipeline) message += ` in ${targetPipeline.name} pipeline`;
        if (createdDeal.deadline) message += ` with deadline ${new Date(createdDeal.deadline).toLocaleDateString()}`;
        if (clientId) message += ` linked to client`;
        if (locationMemberId) message += ` assigned to team member`;

        return {
          success: true,
          message,
          data: { deal: createdDeal },
        };
      } catch (error) {
        console.error("Failed to create deal:", error);
        return {
          success: false,
          message: "Failed to create deal. Please try again.",
        };
      }
    }

    return {
      success: true,
      message:
        "I can help you create a deal. Please provide the deal name.\n\nExample: `/create-deal Enterprise Deal, $50000`",
      requiresMoreInfo: true,
      missingFields: missing.map(formatFieldName),
    };
  },

  createPipeline: async (params, context) => {
    const organizationId = context.organizationId;
    if (!organizationId) {
      return {
        success: false,
        message: "Please select an organization to create a pipeline.",
        requiresMoreInfo: true,
      };
    }

    const rawMessage = textParam(params.rawMessage);
    const isSlashCommand = rawMessage.startsWith("/");

    const parsed = isSlashCommand
      ? parsePipelineArgs(rawMessage)
      : await extractPipelineFromNL(rawMessage);

    const missing = getMissingFields(parsed, ["name"]);

    if (parsed.name) {
      const pipelineName = parsed.name;
      try {
        const createdPipeline = await db.transaction(async (tx) => {
          const [newPipeline] = await tx
            .insert(pipeline)
            .values({
            id: crypto.randomUUID(),
            organizationId,
            locationId: context.locationId || null,
            name: pipelineName,
            description: parsed.description || null,
            createdAt: new Date(),
            updatedAt: new Date(),
            })
            .returning();

          await tx.insert(pipelineStage).values(
            [
              { id: crypto.randomUUID(), name: "Lead In", position: 0, createdAt: new Date(), updatedAt: new Date() },
              { id: crypto.randomUUID(), name: "Qualified", position: 1, createdAt: new Date(), updatedAt: new Date() },
              { id: crypto.randomUUID(), name: "Proposal", position: 2, createdAt: new Date(), updatedAt: new Date() },
              { id: crypto.randomUUID(), name: "Negotiation", position: 3, createdAt: new Date(), updatedAt: new Date() },
              { id: crypto.randomUUID(), name: "Won", position: 4, createdAt: new Date(), updatedAt: new Date() },
            ].map((stage) => ({
              ...stage,
              pipelineId: newPipeline.id,
            }))
          );

          return newPipeline;
        });

        return {
          success: true,
          message: `Created pipeline **${createdPipeline.name}** with 5 default stages.`,
          data: { pipeline: createdPipeline },
        };
      } catch (error) {
        return {
          success: false,
          message: "Failed to create pipeline. Please try again.",
        };
      }
    }

    return {
      success: true,
      message:
        "I can help you create a pipeline. What would you like to name it?\n\nExample: `/create-pipeline Sales Pipeline`",
      requiresMoreInfo: true,
      missingFields: missing.map(formatFieldName),
    };
  },

  createTask: async (params, context) => {
    return {
      success: true,
      message:
        "I can help you create a task. What's the task title and due date?",
      requiresMoreInfo: true,
      missingFields: ["title", "dueDate"],
    };
  },

  logNote: async (params, context) => {
    if (stringArrayParam(params.clientIds).length > 0 || stringArrayParam(params.dealIds).length > 0) {
      return {
        success: true,
        message: "What would you like to note about this record?",
        requiresMoreInfo: true,
        missingFields: ["note"],
      };
    }

    return {
      success: true,
      message: "Please mention a client or deal to add a note to using @.",
      requiresMoreInfo: true,
    };
  },

  sendEmail: async (params, context) => {
    if (stringArrayParam(params.clientIds).length > 0) {
      const clientNames = stringArrayParam(params.clientNames);
      return {
        success: true,
        message: `I'll help you send an email to ${clientNames.join(", ")}. What's the subject and message?`,
        requiresMoreInfo: true,
        missingFields: ["subject", "body"],
      };
    }

    return {
      success: true,
      message: "Please mention a client to email using @.",
      requiresMoreInfo: true,
    };
  },

  scheduleMeeting: async (params, context) => {
    return {
      success: true,
      message:
        "I can help you schedule a meeting. What date and time works for you?",
      requiresMoreInfo: true,
      missingFields: ["date", "time", "attendees"],
    };
  },

  // Workflow Actions
  runWorkflow: async (params, context) => {
    // Check subscription
    const hasSubscription = await hasActiveSubscription(context.userId);
    if (!hasSubscription) {
      return {
        success: false,
        message:
          "⚠️ Workflow features require an active subscription. Please upgrade your plan to access workflow automation.",
      };
    }

    const workflowIds = stringArrayParam(params.workflowIds);
    if (workflowIds.length > 0) {
      const workflowId = workflowIds[0];

      // Check if workflow exists and user has access
      const workflow = await db.query.workflows.findFirst({
        where: and(eq(workflows.id, workflowId), eq(workflows.userId, context.userId)),
      });

      if (!workflow) {
        return {
          success: false,
          message: "Workflow not found or you don't have access to it.",
        };
      }

      return {
        success: true,
        message: `Ready to run workflow "${workflow.name}". Confirm to proceed.`,
        data: { workflowId, workflowName: workflow.name },
        requiresMoreInfo: true,
        missingFields: ["confirmation"],
      };
    }

    return {
      success: true,
      message: "Please mention a workflow to run using @.",
      requiresMoreInfo: true,
    };
  },

  listWorkflows: async (params, context) => {
    // Check subscription
    const hasSubscription = await hasActiveSubscription(context.userId);
    if (!hasSubscription) {
      return {
        success: false,
        message:
          "⚠️ Workflow features require an active subscription. Please upgrade your plan to access workflow automation.",
      };
    }

    const workflowRows = await db.query.workflows.findMany({
      where: and(eq(workflows.userId, context.userId), eq(workflows.archived, false)),
      columns: {
        id: true,
        name: true,
        description: true,
        archived: true,
      },
      limit: 10,
    });

    if (workflowRows.length === 0) {
      return {
        success: true,
        message: "You don't have any workflows yet. Would you like to create one?",
        data: { workflows: [] },
      };
    }

    const workflowList = workflowRows
      .map((w) => `• ${w.name}`)
      .join("\n");

    return {
      success: true,
      message: `Here are your workflows:\n\n${workflowList}`,
      data: { workflows: workflowRows },
    };
  },

  generateWorkflow: async (params, context) => {
    // Check subscription
    const hasSubscription = await hasActiveSubscription(context.userId);
    if (!hasSubscription) {
      return {
        success: false,
        message:
          "⚠️ Workflow features require an active subscription. Please upgrade your plan to access workflow automation.",
      };
    }

    if (!context.organizationId) {
      return {
        success: false,
        message: "Please select an organization to generate a workflow.",
        requiresMoreInfo: true,
      };
    }

    const rawMessage = textParam(params.rawMessage);

    // Check if the message has enough detail to generate a workflow
    if (rawMessage.length < 20 || !rawMessage.toLowerCase().includes("workflow")) {
      return {
        success: true,
        message:
          "Describe the workflow you want to create. What should trigger it and what actions should it perform?\n\nExample: 'Generate a workflow for application intake that creates a client when a Google Form is submitted, then sends a welcome email'",
        requiresMoreInfo: true,
        missingFields: ["description"],
      };
    }

    try {
      const workflow = await generateWorkflow(rawMessage, {
        organizationId: context.organizationId,
        locationId: context.locationId,
      });

      if (!workflow) {
        return {
          success: false,
          message: "Failed to generate workflow. Please try again with more details about the trigger and actions.",
        };
      }

      const createdWorkflow = await persistGeneratedWorkflow({
        workflow,
        context: { ...context, organizationId: context.organizationId },
      });

      const nodeList = workflow.nodes.map(n => `• ${n.name} (${n.type})`).join("\n");

      return {
        success: true,
        message: `Created workflow **${workflow.name}**\n\n${workflow.description}\n\n**Nodes:**\n${nodeList}\n\n[Open workflow editor](/workflows/${createdWorkflow.id})`,
        data: { workflow: createdWorkflow },
      };
    } catch (error) {
      console.error("Failed to create workflow:", error);
      return {
        success: false,
        message: "Failed to create workflow. Please try again.",
      };
    }
  },

  generateBundle: async (params, context) => {
    // Check subscription
    const hasSubscription = await hasActiveSubscription(context.userId);
    if (!hasSubscription) {
      return {
        success: false,
        message:
          "⚠️ Workflow features require an active subscription. Please upgrade your plan to access workflow automation.",
      };
    }

    if (!context.organizationId) {
      return {
        success: false,
        message: "Please select an organization to generate a bundle.",
        requiresMoreInfo: true,
      };
    }

    const rawMessage = textParam(params.rawMessage);

    // Check if the message has enough detail to generate a bundle
    if (rawMessage.length < 15) {
      return {
        success: true,
        message:
          "Describe the bundle workflow you want to create. What actions should it perform?\n\nExample: 'Generate a bundle that sends a notification via Discord and Slack'",
        requiresMoreInfo: true,
        missingFields: ["description"],
      };
    }

    try {
      const workflow = await generateBundleWorkflow(rawMessage, {
        organizationId: context.organizationId,
        locationId: context.locationId,
      });

      if (!workflow) {
        return {
          success: false,
          message: "Failed to generate bundle. Please try again with more details about the actions.",
        };
      }

      const createdWorkflow = await persistGeneratedWorkflow({
        workflow,
        context: { ...context, organizationId: context.organizationId },
        isBundle: true,
      });

      const nodeList = workflow.nodes.map(n => `• ${n.name} (${n.type})`).join("\n");

      return {
        success: true,
        message: `Created bundle **${workflow.name}**\n\n${workflow.description}\n\n**Nodes:**\n${nodeList}\n\n[Open bundle editor](/bundles/${createdWorkflow.id})`,
        data: { workflow: createdWorkflow },
      };
    } catch (error) {
      console.error("Failed to create bundle:", error);
      return {
        success: false,
        message: "Failed to create bundle. Please try again.",
      };
    }
  },

  // AI Actions
  summarise: async (params, context) => {
    const clientIds = stringArrayParam(params.clientIds);
    const dealIds = stringArrayParam(params.dealIds);
    if (clientIds.length > 0 || dealIds.length > 0) {
      return {
        success: true,
        message: "I'll summarise the mentioned records for you.",
        data: {
          clientIds,
          dealIds,
        },
      };
    }

    return {
      success: true,
      message:
        "What would you like me to summarise? You can mention a client or deal using @.",
      requiresMoreInfo: true,
    };
  },

  explain: async (params, context) => {
    return {
      success: true,
      message: "What would you like me to explain?",
      requiresMoreInfo: true,
      missingFields: ["topic"],
    };
  },

  draftEmail: async (params, context) => {
    if (stringArrayParam(params.clientIds).length > 0) {
      const clientNames = stringArrayParam(params.clientNames);
      return {
        success: true,
        message: `I'll draft an email for ${clientNames.join(", ")}. What's the purpose of this email?`,
        requiresMoreInfo: true,
        missingFields: ["purpose"],
      };
    }

    return {
      success: true,
      message:
        "I can draft an email for you. Mention a client using @ and tell me the purpose.",
      requiresMoreInfo: true,
    };
  },

  analyze: async (params, context) => {
    return {
      success: true,
      message:
        "What data would you like me to analyze? You can mention specific clients, deals, or pipelines.",
      requiresMoreInfo: true,
    };
  },

  research: async (params, context) => {
    return {
      success: true,
      message: "What topic would you like me to research?",
      requiresMoreInfo: true,
      missingFields: ["topic"],
    };
  },

  // Query Actions
  showClients: async (params, context) => {
    if (!context.organizationId) {
      return {
        success: false,
        message: "Please select an organization to view clients.",
      };
    }

    const clients = await db.query.client.findMany({
      where: compactConditions([
        eq(client.organizationId, context.organizationId),
        optionalLocationCondition(client.locationId, context.locationId),
      ]),
      columns: {
        id: true,
        name: true,
        email: true,
        companyName: true,
      },
      limit: 10,
      orderBy: desc(client.createdAt),
    });

    if (clients.length === 0) {
      return {
        success: true,
        message: "No clients found. Would you like to create one?",
        data: { clients: [] },
      };
    }

    const clientList = clients
      .map((c) => `• ${c.name}${c.email ? ` (${c.email})` : ""}`)
      .join("\n");

    return {
      success: true,
      message: `Here are your recent clients:\n\n${clientList}`,
      data: { clients },
    };
  },

  showDeals: async (params, context) => {
    if (!context.organizationId) {
      return {
        success: false,
        message: "Please select an organization to view deals.",
      };
    }

    const deals = await db.query.deal.findMany({
      where: compactConditions([
        eq(deal.organizationId, context.organizationId),
        optionalLocationCondition(deal.locationId, context.locationId),
      ]),
      columns: {
        id: true,
        name: true,
        value: true,
      },
      with: {
        pipelineStage: {
          columns: { name: true },
        },
      },
      limit: 10,
      orderBy: desc(deal.createdAt),
    });

    if (deals.length === 0) {
      return {
        success: true,
        message: "No deals found. Would you like to create one?",
        data: { deals: [] },
      };
    }

    const dealList = deals
      .map(
        (d) =>
          `• ${d.name}${d.value ? ` - $${d.value}` : ""}${d.pipelineStage ? ` (${d.pipelineStage.name})` : ""}`
      )
      .join("\n");

    return {
      success: true,
      message: `Here are your recent deals:\n\n${dealList}`,
      data: { deals },
    };
  },

  showPipelines: async (params, context) => {
    if (!context.organizationId) {
      return {
        success: false,
        message: "Please select an organization to view pipelines.",
      };
    }

    const pipelines = await db.query.pipeline.findMany({
      where: compactConditions([
        eq(pipeline.organizationId, context.organizationId),
        optionalLocationCondition(pipeline.locationId, context.locationId),
      ]),
      columns: {
        id: true,
        name: true,
      },
      with: {
        pipelineStages: {
          columns: { id: true },
        },
      },
      limit: 10,
    });

    if (pipelines.length === 0) {
      return {
        success: true,
        message: "No pipelines found. Would you like to create one?",
        data: { pipelines: [] },
      };
    }

    const pipelineList = pipelines
      .map((p) => `• ${p.name} (${p.pipelineStages.length} stages)`)
      .join("\n");

    return {
      success: true,
      message: `Here are your pipelines:\n\n${pipelineList}`,
      data: { pipelines },
    };
  },

  showWorkflows: async (params, context) => {
    const workflowRows = await db.query.workflows.findMany({
      where: and(eq(workflows.userId, context.userId), eq(workflows.archived, false)),
      columns: {
        id: true,
        name: true,
        description: true,
        archived: true,
      },
      limit: 10,
    });

    if (workflowRows.length === 0) {
      return {
        success: true,
        message: "No workflows found. Would you like to create one?",
        data: { workflows: [] },
      };
    }

    const workflowList = workflowRows
      .map((w) => `• ${w.name}`)
      .join("\n");

    return {
      success: true,
      message: `Here are your workflows:\n\n${workflowList}`,
      data: { workflows: workflowRows },
    };
  },

  search: async (params, context) => {
    const rawMessage = textParam(params.rawMessage);

    if (!rawMessage) {
      return {
        success: true,
        message: "What would you like to search for?",
        requiresMoreInfo: true,
        missingFields: ["query"],
      };
    }

    // Use AI to determine what type of search this is
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Analyze this search query and determine what the user is looking for. Return ONLY valid JSON with these fields:
- type: string ("clients", "deals", "pipelines", or "workflows")

Query: "${rawMessage}"

JSON:`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Route to the appropriate handler
        if (parsed.type === "clients") {
          return handlers.queryClients(params, context);
        } else if (parsed.type === "deals") {
          return handlers.queryDeals(params, context);
        } else if (parsed.type === "pipelines") {
          return handlers.showPipelines(params, context);
        } else if (parsed.type === "workflows") {
          // Show workflows with basic filtering
          const workflowRows = await db.query.workflows.findMany({
            where: compactConditions([
              context.organizationId ? eq(workflows.organizationId, context.organizationId) : undefined,
              strictLocationCondition(workflows.locationId, context.locationId),
            ]),
            limit: 10,
            orderBy: desc(workflows.createdAt),
          });

          return {
            success: true,
            message: `Found ${workflowRows.length} workflow${workflowRows.length !== 1 ? "s" : ""}`,
            data: { workflows: workflowRows },
          };
        }
      }
    } catch (error) {
      console.error("Failed to route search query:", error);
    }

    // Default to deals if we can't determine
    return handlers.queryDeals(params, context);
  },

  // Natural Language Query Handlers
  queryClients: async (params, context) => {
    if (!context.organizationId) {
      return {
        success: false,
        message: "Please select an organization to query clients.",
      };
    }

    const rawMessage = textParam(params.rawMessage);
    const filters = await extractClientFiltersFromNL(rawMessage);

    const conditions: SQL[] = [eq(client.organizationId, context.organizationId)];
    const locationFilter = optionalLocationCondition(client.locationId, context.locationId);
    if (locationFilter) conditions.push(locationFilter);

    // Company name filter (case-insensitive contains)
    if (filters.companyName) {
      conditions.push(ilike(client.companyName, `%${filters.companyName}%`));
    }

    // Name filter
    if (filters.name) {
      conditions.push(ilike(client.name, `%${filters.name}%`));
    }

    // Email filter
    if (filters.email) {
      conditions.push(ilike(client.email, `%${filters.email}%`));
    }

    // Type filter
    if (filters.type) {
      conditions.push(eq(client.type, filters.type as typeof client.$inferSelect.type));
    }

    // Lifecycle stage filter
    if (filters.lifecycleStage) {
      conditions.push(eq(client.lifecycleStage, filters.lifecycleStage as NonNullable<typeof client.$inferSelect.lifecycleStage>));
    }

    // Date filters
    if (filters.createdOn) {
      const date = new Date(filters.createdOn);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      conditions.push(gte(client.createdAt, date), lt(client.createdAt, nextDay));
    } else {
      if (filters.createdAfter) {
        conditions.push(gte(client.createdAt, new Date(filters.createdAfter)));
      }
      if (filters.createdBefore) {
        conditions.push(lte(client.createdAt, new Date(filters.createdBefore)));
      }
    }

    const clients = await db.query.client.findMany({
      where: and(...conditions),
      columns: {
        id: true,
        name: true,
        email: true,
        companyName: true,
        type: true,
        lifecycleStage: true,
        createdAt: true,
      },
      limit: 50,
      orderBy: desc(client.createdAt),
    });

    if (clients.length === 0) {
      // Build description of filters applied
      const filterDesc: string[] = [];
      if (filters.companyName) filterDesc.push(`from "${filters.companyName}"`);
      if (filters.name) filterDesc.push(`named "${filters.name}"`);
      if (filters.createdOn) filterDesc.push(`created on ${filters.createdOn}`);
      if (filters.createdAfter) filterDesc.push(`created after ${filters.createdAfter}`);
      if (filters.type) filterDesc.push(`of type ${filters.type}`);

      return {
        success: true,
        message: `No clients found${filterDesc.length > 0 ? ` ${filterDesc.join(", ")}` : ""}.`,
        data: { clients: [], filters },
      };
    }

    // Build URL with Nuqs params
    const urlParams = new URLSearchParams();
    if (filters.companyName) urlParams.set("search", filters.companyName);
    if (filters.name) urlParams.set("search", filters.name);
    if (filters.type) urlParams.set("types", filters.type);
    if (filters.createdOn) {
      urlParams.set("createdAtStart", new Date(filters.createdOn).toISOString());
      const nextDay = new Date(filters.createdOn);
      nextDay.setDate(nextDay.getDate() + 1);
      urlParams.set("createdAtEnd", nextDay.toISOString());
    }
    if (filters.createdAfter) {
      urlParams.set("createdAtStart", new Date(filters.createdAfter).toISOString());
    }
    if (filters.createdBefore) {
      urlParams.set("createdAtEnd", new Date(filters.createdBefore).toISOString());
    }

    const clientsUrl = `/clients${urlParams.toString() ? `?${urlParams.toString()}` : ""}`;

    // Build filter description
    const filterDesc: string[] = [];
    if (filters.companyName) filterDesc.push(`from "${filters.companyName}"`);
    if (filters.name) filterDesc.push(`named "${filters.name}"`);
    if (filters.createdOn) filterDesc.push(`created on ${filters.createdOn}`);
    if (filters.createdAfter) filterDesc.push(`created after ${filters.createdAfter}`);
    if (filters.type) filterDesc.push(`of type ${filters.type}`);

    return {
      success: true,
      message: `Found ${clients.length} client${clients.length !== 1 ? "s" : ""}${filterDesc.length > 0 ? ` ${filterDesc.join(", ")}` : ""}`,
      data: { clients, filters, url: clientsUrl },
    };
  },

  queryDeals: async (params, context) => {
    if (!context.organizationId) {
      return {
        success: false,
        message: "Please select an organization to query deals.",
      };
    }

    const rawMessage = textParam(params.rawMessage);
    const filters = await extractDealFiltersFromNL(rawMessage);

    const conditions: SQL[] = [eq(deal.organizationId, context.organizationId)];
    const locationFilter = optionalLocationCondition(deal.locationId, context.locationId);
    if (locationFilter) conditions.push(locationFilter);
    let stageIds: string[] = [];

    // Value filters
    if (filters.minValue !== undefined) {
      conditions.push(gte(deal.value, String(filters.minValue)));
    }
    if (filters.maxValue !== undefined) {
      conditions.push(lte(deal.value, String(filters.maxValue)));
    }

    // Currency filter
    if (filters.currency) {
      conditions.push(eq(deal.currency, filters.currency));
    }

    // Name filter
    if (filters.name) {
      conditions.push(ilike(deal.name, `%${filters.name}%`));
    }

    // Pipeline filter - need to look up by name
    if (filters.pipelineName) {
      const targetPipeline = await db.query.pipeline.findFirst({
        where: compactConditions([
          eq(pipeline.organizationId, context.organizationId),
          optionalLocationCondition(pipeline.locationId, context.locationId),
          ilike(pipeline.name, `%${filters.pipelineName}%`),
        ]),
      });
      if (targetPipeline) {
        conditions.push(eq(deal.pipelineId, targetPipeline.id));
      }
    }

    // Stage filter - need to look up by name
    if (filters.stageName) {
      const stages = await db.query.pipelineStage.findMany({
        where: ilike(pipelineStage.name, `%${filters.stageName}%`),
        with: {
          pipeline: true,
        },
      });
      stageIds = stages
        .filter(
          (stage) =>
            stage.pipeline.organizationId === context.organizationId &&
            (!context.locationId || stage.pipeline.locationId === context.locationId)
        )
        .map((stage) => stage.id);
      if (stageIds.length > 0) {
        conditions.push(inArray(deal.pipelineStageId, stageIds));
      }
    }

    // Date filters (creation date)
    if (filters.createdOn) {
      const date = new Date(filters.createdOn);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      conditions.push(gte(deal.createdAt, date), lt(deal.createdAt, nextDay));
    } else {
      if (filters.createdAfter) {
        conditions.push(gte(deal.createdAt, new Date(filters.createdAfter)));
      }
      if (filters.createdBefore) {
        conditions.push(lte(deal.createdAt, new Date(filters.createdBefore)));
      }
    }

    // Deadline filters
    if (filters.hasPassedDeadline) {
      // Deals with deadline before today (overdue/passed)
      conditions.push(lt(deal.deadline, new Date()));
    } else if (filters.deadlineOn) {
      const date = new Date(filters.deadlineOn);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      conditions.push(gte(deal.deadline, date), lt(deal.deadline, nextDay));
    } else {
      if (filters.deadlineBefore) {
        conditions.push(lte(deal.deadline, new Date(filters.deadlineBefore)));
      }
      if (filters.deadlineAfter) {
        conditions.push(gte(deal.deadline, new Date(filters.deadlineAfter)));
      }
    }

    const deals = await db.query.deal.findMany({
      where: and(...conditions),
      columns: {
        id: true,
        name: true,
        value: true,
        currency: true,
        createdAt: true,
        deadline: true,
      },
      with: {
        pipeline: {
          columns: { name: true },
        },
        pipelineStage: {
          columns: { name: true },
        },
      },
      limit: 50,
      orderBy: desc(deal.createdAt),
    });

    if (deals.length === 0) {
      // Build description of filters applied
      const filterDesc: string[] = [];
      if (filters.minValue !== undefined) {
        const symbol = filters.currency === "GBP" ? "£" : filters.currency === "EUR" ? "€" : "$";
        filterDesc.push(`above ${symbol}${filters.minValue.toLocaleString()}`);
      }
      if (filters.maxValue !== undefined) {
        const symbol = filters.currency === "GBP" ? "£" : filters.currency === "EUR" ? "€" : "$";
        filterDesc.push(`below ${symbol}${filters.maxValue.toLocaleString()}`);
      }
      if (filters.pipelineName) filterDesc.push(`from "${filters.pipelineName}" pipeline`);
      if (filters.stageName) filterDesc.push(`in "${filters.stageName}" stage`);
      if (filters.hasPassedDeadline) filterDesc.push("with passed deadline");
      if (filters.deadlineOn) filterDesc.push(`with deadline on ${filters.deadlineOn}`);
      if (filters.deadlineBefore) filterDesc.push(`with deadline before ${filters.deadlineBefore}`);
      if (filters.deadlineAfter) filterDesc.push(`with deadline after ${filters.deadlineAfter}`);

      return {
        success: true,
        message: `No deals found${filterDesc.length > 0 ? ` ${filterDesc.join(", ")}` : ""}.`,
        data: { deals: [], filters },
      };
    }

    // Build URL with Nuqs params
    const urlParams = new URLSearchParams();
    if (filters.minValue !== undefined) urlParams.set("valueMin", filters.minValue.toString());
    if (filters.maxValue !== undefined) urlParams.set("valueMax", filters.maxValue.toString());
    if (filters.currency) urlParams.set("valueCurrency", filters.currency);
    if (filters.name) urlParams.set("search", filters.name);
    // For stage filter, we'd need the stage IDs - use stages param if we have them
    if (filters.stageName && stageIds.length > 0) {
      urlParams.set("stages", stageIds.join(","));
    }
    // Deadline filters
    if (filters.deadlineBefore) urlParams.set("deadlineEnd", new Date(filters.deadlineBefore).toISOString());
    if (filters.deadlineAfter) urlParams.set("deadlineStart", new Date(filters.deadlineAfter).toISOString());
    if (filters.deadlineOn) {
      urlParams.set("deadlineStart", new Date(filters.deadlineOn).toISOString());
      const nextDay = new Date(filters.deadlineOn);
      nextDay.setDate(nextDay.getDate() + 1);
      urlParams.set("deadlineEnd", nextDay.toISOString());
    }
    if (filters.hasPassedDeadline) {
      urlParams.set("deadlineEnd", new Date().toISOString());
    }

    const dealsUrl = `/deals${urlParams.toString() ? `?${urlParams.toString()}` : ""}`;

    // Build filter description
    const filterDesc: string[] = [];
    if (filters.minValue !== undefined) {
      const symbol = filters.currency === "GBP" ? "£" : filters.currency === "EUR" ? "€" : "$";
      filterDesc.push(`above ${symbol}${filters.minValue.toLocaleString()}`);
    }
    if (filters.maxValue !== undefined) {
      const symbol = filters.currency === "GBP" ? "£" : filters.currency === "EUR" ? "€" : "$";
      filterDesc.push(`below ${symbol}${filters.maxValue.toLocaleString()}`);
    }
    if (filters.pipelineName) filterDesc.push(`from "${filters.pipelineName}" pipeline`);
    if (filters.stageName) filterDesc.push(`in "${filters.stageName}" stage`);
    if (filters.hasPassedDeadline) filterDesc.push("with passed deadline");
    if (filters.deadlineOn) filterDesc.push(`with deadline on ${filters.deadlineOn}`);
    if (filters.deadlineBefore) filterDesc.push(`with deadline before ${filters.deadlineBefore}`);
    if (filters.deadlineAfter) filterDesc.push(`with deadline after ${filters.deadlineAfter}`);

    return {
      success: true,
      message: `Found ${deals.length} deal${deals.length !== 1 ? "s" : ""}${filterDesc.length > 0 ? ` ${filterDesc.join(", ")}` : ""}`,
      data: { deals, filters, url: dealsUrl },
    };
  },
};

export async function executeAction(
  routeResult: RouteResult,
  context: ActionContext
): Promise<ActionResult> {
  const handler = handlers[routeResult.intent.handler];

  if (!handler) {
    return {
      success: false,
      message: `Unknown action: ${routeResult.intent.handler}`,
    };
  }

  return handler(routeResult.extractedParams, context);
}
