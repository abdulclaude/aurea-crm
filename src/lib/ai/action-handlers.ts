import prisma from "@/lib/db";
import type { RouteResult } from "./intent-router";
import {
  parseContactArgs,
  parseDealArgs,
  parsePipelineArgs,
  getMissingFields,
  formatFieldName,
} from "./argument-parser";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateWorkflow, generateBundleWorkflow } from "./workflow-generator";
import { polarClient } from "@/lib/polar";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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
async function extractContactFromNL(message: string): Promise<{
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  tags?: string[];
  assigneeName?: string;
}> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Extract contact information from this message. Return ONLY valid JSON with these fields (omit fields if not mentioned):
- name: string (person's full name)
- email: string
- phone: string
- companyName: string (company/organization they work for)
- tags: string[] (array of tags/labels to categorize the contact, from phrases like "tag as", "label as", "tags:")
- assigneeName: string (name of team member to assign contact to, from phrases like "assign to", "owner", "assigned to")

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
    console.error("Failed to extract contact from NL:", error);
  }
  return {};
}

async function extractDealFromNL(message: string): Promise<{
  name?: string;
  value?: number;
  currency?: string;
  deadline?: string;
  contactName?: string;
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
- contactName: string (name of contact to associate with deal, from phrases like "for contact", "assign to contact", "link to")
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

// Extract contact query filters from natural language
async function extractContactFiltersFromNL(message: string): Promise<{
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

  const prompt = `Extract contact filter criteria from this search query. Return ONLY valid JSON with these fields (omit fields if not mentioned):
- companyName: string (company/organization name to filter by)
- name: string (contact name to search for)
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
    console.error("Failed to extract contact filters from NL:", error);
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
  subaccountId: string | null;
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
  requiresMoreInfo?: boolean;
  missingFields?: string[];
}

type ActionHandler = (
  params: Record<string, any>,
  context: ActionContext
) => Promise<ActionResult>;

const handlers: Record<string, ActionHandler> = {
  // CRM Actions
  createContact: async (params, context) => {
    if (!context.organizationId) {
      return {
        success: false,
        message: "Please select an organization to create a contact.",
        requiresMoreInfo: true,
      };
    }

    const rawMessage = params.rawMessage || "";
    const isSlashCommand = rawMessage.startsWith("/");

    // Use regex parser for slash commands, AI for natural language
    const parsed = isSlashCommand
      ? parseContactArgs(rawMessage)
      : await extractContactFromNL(rawMessage);

    const missing = getMissingFields(parsed, ["name"]);

    // If we have at least a name, create the contact
    if (parsed.name) {
      try {
        // Look up team member by name if provided
        let subaccountMemberId: string | undefined;
        if (parsed.assigneeName && context.subaccountId) {
          const member = await prisma.subaccountMember.findFirst({
            where: {
              subaccountId: context.subaccountId,
              user: {
                name: {
                  contains: parsed.assigneeName,
                  mode: "insensitive",
                },
              },
            },
          });
          subaccountMemberId = member?.id;
        }

        const contact = await prisma.contact.create({
          data: {
            id: crypto.randomUUID(),
            organizationId: context.organizationId,
            subaccountId: context.subaccountId || null,
            name: parsed.name,
            email: parsed.email || null,
            phone: parsed.phone || null,
            companyName: parsed.companyName || null,
            tags: parsed.tags || [],
            type: "LEAD", // Default type
            createdAt: new Date(),
            updatedAt: new Date(),
            // Create assignee association if found
            ...(subaccountMemberId && {
              contactAssignee: {
                create: {
                  id: crypto.randomUUID(),
                  subaccountMemberId,
                },
              },
            }),
          },
        });

        let message = `Created contact **${contact.name}**`;
        if (contact.email) message += ` (${contact.email})`;
        if (contact.companyName) message += ` at ${contact.companyName}`;
        if (parsed.tags && parsed.tags.length > 0) message += ` with tags: ${parsed.tags.join(", ")}`;
        if (subaccountMemberId) message += ` assigned to team member`;

        return {
          success: true,
          message,
          data: { contact },
        };
      } catch (error) {
        console.error("Failed to create contact:", error);
        return {
          success: false,
          message: "Failed to create contact. Please try again.",
        };
      }
    }

    // Need more info
    return {
      success: true,
      message:
        "I can help you create a contact. Please provide at least the contact's name.\n\nExample: `/create-contact John Doe, john@email.com, Acme Corp`",
      requiresMoreInfo: true,
      missingFields: missing.map(formatFieldName),
    };
  },

  createDeal: async (params, context) => {
    if (!context.organizationId) {
      return {
        success: false,
        message: "Please select an organization to create a deal.",
        requiresMoreInfo: true,
      };
    }

    const rawMessage = params.rawMessage || "";
    const isSlashCommand = rawMessage.startsWith("/");

    const parsed = isSlashCommand
      ? parseDealArgs(rawMessage)
      : await extractDealFromNL(rawMessage);

    const missing = getMissingFields(parsed, ["name"]);

    if (parsed.name) {
      try {
        // Look up pipeline by name if provided, otherwise get default
        let targetPipeline;
        if (parsed.pipelineName) {
          targetPipeline = await prisma.pipeline.findFirst({
            where: {
              organizationId: context.organizationId,
              subaccountId: context.subaccountId || null,
              name: {
                contains: parsed.pipelineName,
                mode: "insensitive",
              },
            },
            include: { pipelineStage: { orderBy: { position: "asc" }, take: 1 } },
          });
        }

        // Fall back to default pipeline if no specific pipeline found or requested
        if (!targetPipeline) {
          targetPipeline = await prisma.pipeline.findFirst({
            where: {
              organizationId: context.organizationId,
              subaccountId: context.subaccountId || null,
              isDefault: true,
            },
            include: { pipelineStage: { orderBy: { position: "asc" }, take: 1 } },
          });
        }

        // Look up contact by name if provided
        let contactId: string | undefined;
        if (parsed.contactName) {
          const contact = await prisma.contact.findFirst({
            where: {
              organizationId: context.organizationId,
              subaccountId: context.subaccountId || null,
              name: {
                contains: parsed.contactName,
                mode: "insensitive",
              },
            },
          });
          contactId = contact?.id;
        }

        // Look up team member by name if provided
        let subaccountMemberId: string | undefined;
        if (parsed.assigneeName && context.subaccountId) {
          const member = await prisma.subaccountMember.findFirst({
            where: {
              subaccountId: context.subaccountId,
              user: {
                name: {
                  contains: parsed.assigneeName,
                  mode: "insensitive",
                },
              },
            },
          });
          subaccountMemberId = member?.id;
        }

        const deal = await prisma.deal.create({
          data: {
            id: crypto.randomUUID(),
            organizationId: context.organizationId,
            subaccountId: context.subaccountId || null,
            name: parsed.name,
            value: parsed.value || null,
            currency: parsed.currency || "USD",
            deadline: parsed.deadline ? new Date(parsed.deadline) : null,
            pipelineId: targetPipeline?.id || null,
            pipelineStageId: targetPipeline?.pipelineStage[0]?.id || null,
            createdAt: new Date(),
            updatedAt: new Date(),
            // Create contact association if found
            ...(contactId && {
              dealContact: {
                create: {
                  id: crypto.randomUUID(),
                  contactId,
                },
              },
            }),
            // Create team member assignment if found
            ...(subaccountMemberId && {
              dealMember: {
                create: {
                  id: crypto.randomUUID(),
                  subaccountMemberId,
                },
              },
            }),
          },
        });

        let message = `Created deal **${deal.name}**`;
        if (deal.value) message += ` worth ${deal.currency} ${deal.value}`;
        if (targetPipeline) message += ` in ${targetPipeline.name} pipeline`;
        if (deal.deadline) message += ` with deadline ${new Date(deal.deadline).toLocaleDateString()}`;
        if (contactId) message += ` linked to contact`;
        if (subaccountMemberId) message += ` assigned to team member`;

        return {
          success: true,
          message,
          data: { deal },
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
    if (!context.organizationId) {
      return {
        success: false,
        message: "Please select an organization to create a pipeline.",
        requiresMoreInfo: true,
      };
    }

    const rawMessage = params.rawMessage || "";
    const isSlashCommand = rawMessage.startsWith("/");

    const parsed = isSlashCommand
      ? parsePipelineArgs(rawMessage)
      : await extractPipelineFromNL(rawMessage);

    const missing = getMissingFields(parsed, ["name"]);

    if (parsed.name) {
      try {
        const pipeline = await prisma.pipeline.create({
          data: {
            id: crypto.randomUUID(),
            organizationId: context.organizationId,
            subaccountId: context.subaccountId || null,
            name: parsed.name,
            description: parsed.description || null,
            createdAt: new Date(),
            updatedAt: new Date(),
            pipelineStage: {
              create: [
                { id: crypto.randomUUID(), name: "Lead In", position: 0, createdAt: new Date(), updatedAt: new Date() },
                { id: crypto.randomUUID(), name: "Qualified", position: 1, createdAt: new Date(), updatedAt: new Date() },
                { id: crypto.randomUUID(), name: "Proposal", position: 2, createdAt: new Date(), updatedAt: new Date() },
                { id: crypto.randomUUID(), name: "Negotiation", position: 3, createdAt: new Date(), updatedAt: new Date() },
                { id: crypto.randomUUID(), name: "Won", position: 4, createdAt: new Date(), updatedAt: new Date() },
              ],
            },
          },
        });

        return {
          success: true,
          message: `Created pipeline **${pipeline.name}** with 5 default stages.`,
          data: { pipeline },
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
    if (params.contactIds?.length > 0 || params.dealIds?.length > 0) {
      return {
        success: true,
        message: "What would you like to note about this record?",
        requiresMoreInfo: true,
        missingFields: ["note"],
      };
    }

    return {
      success: true,
      message: "Please mention a contact or deal to add a note to using @.",
      requiresMoreInfo: true,
    };
  },

  sendEmail: async (params, context) => {
    if (params.contactIds?.length > 0) {
      return {
        success: true,
        message: `I'll help you send an email to ${params.contactNames?.join(", ")}. What's the subject and message?`,
        requiresMoreInfo: true,
        missingFields: ["subject", "body"],
      };
    }

    return {
      success: true,
      message: "Please mention a contact to email using @.",
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

    if (params.workflowIds?.length > 0) {
      const workflowId = params.workflowIds[0];

      // Check if workflow exists and user has access
      const workflow = await prisma.workflows.findFirst({
        where: {
          id: workflowId,
          userId: context.userId,
        },
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

    const workflows = await prisma.workflows.findMany({
      where: {
        userId: context.userId,
        archived: false,
      },
      select: {
        id: true,
        name: true,
        description: true,
        archived: true,
      },
      take: 10,
    });

    if (workflows.length === 0) {
      return {
        success: true,
        message: "You don't have any workflows yet. Would you like to create one?",
        data: { workflows: [] },
      };
    }

    const workflowList = workflows
      .map((w: { name: string }) => `• ${w.name}`)
      .join("\n");

    return {
      success: true,
      message: `Here are your workflows:\n\n${workflowList}`,
      data: { workflows },
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

    const rawMessage = params.rawMessage || "";

    // Check if the message has enough detail to generate a workflow
    if (rawMessage.length < 20 || !rawMessage.toLowerCase().includes("workflow")) {
      return {
        success: true,
        message:
          "Describe the workflow you want to create. What should trigger it and what actions should it perform?\n\nExample: 'Generate a workflow for application intake that creates a contact when a Google Form is submitted, then sends a welcome email'",
        requiresMoreInfo: true,
        missingFields: ["description"],
      };
    }

    try {
      const workflow = await generateWorkflow(rawMessage, {
        organizationId: context.organizationId,
        subaccountId: context.subaccountId,
      });

      if (!workflow) {
        return {
          success: false,
          message: "Failed to generate workflow. Please try again with more details about the trigger and actions.",
        };
      }

      // Create the workflow in the database
      const createdWorkflow = await prisma.workflows.create({
        data: {
          id: crypto.randomUUID(),
          userId: context.userId,
          organizationId: context.organizationId,
          subaccountId: context.subaccountId,
          name: workflow.name,
          description: workflow.description,
          createdAt: new Date(),
          updatedAt: new Date(),
          Node: {
            create: workflow.nodes.map(node => ({
              id: crypto.randomUUID(),
              name: node.name,
              type: node.type as any,
              position: node.position,
              data: node.data,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          },
        },
        include: {
          Node: true,
        },
      });

      // Create connections between nodes
      // Map generated node IDs to created node IDs by matching name and type
      const nodeIdMap = new Map<string, string>();
      workflow.nodes.forEach((genNode) => {
        const createdNode = createdWorkflow.Node.find(
          (n: any) => n.name === genNode.name && n.type === genNode.type
        );
        if (createdNode) {
          nodeIdMap.set(genNode.id, createdNode.id);
        }
      });

      console.log("[Workflow Gen] Generated connections:", workflow.connections);
      console.log("[Workflow Gen] Node ID map:", Object.fromEntries(nodeIdMap));

      for (const conn of workflow.connections) {
        const fromNodeId = nodeIdMap.get(conn.sourceId);
        const toNodeId = nodeIdMap.get(conn.targetId);
        console.log(`[Workflow Gen] Creating connection: ${conn.sourceId} -> ${conn.targetId}, mapped: ${fromNodeId} -> ${toNodeId}`);
        if (fromNodeId && toNodeId) {
          await prisma.connection.create({
            data: {
              id: crypto.randomUUID(),
              workflowId: createdWorkflow.id,
              fromNodeId,
              toNodeId,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
          console.log(`[Workflow Gen] Connection created successfully`);
        } else {
          console.log(`[Workflow Gen] Failed to map connection - missing node ID`);
        }
      }

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

    const rawMessage = params.rawMessage || "";

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
        subaccountId: context.subaccountId,
      });

      if (!workflow) {
        return {
          success: false,
          message: "Failed to generate bundle. Please try again with more details about the actions.",
        };
      }

      // Create the bundle workflow in the database
      const createdWorkflow = await prisma.workflows.create({
        data: {
          id: crypto.randomUUID(),
          userId: context.userId,
          organizationId: context.organizationId,
          subaccountId: context.subaccountId,
          name: workflow.name,
          description: workflow.description,
          isBundle: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          Node: {
            create: workflow.nodes.map(node => ({
              id: crypto.randomUUID(),
              name: node.name,
              type: node.type as any,
              position: node.position,
              data: node.data,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          },
        },
        include: {
          Node: true,
        },
      });

      // Create connections between nodes
      const nodeIdMap = new Map<string, string>();
      workflow.nodes.forEach((genNode) => {
        const createdNode = createdWorkflow.Node.find(
          (n: any) => n.name === genNode.name && n.type === genNode.type
        );
        if (createdNode) {
          nodeIdMap.set(genNode.id, createdNode.id);
        }
      });

      for (const conn of workflow.connections) {
        const fromNodeId = nodeIdMap.get(conn.sourceId);
        const toNodeId = nodeIdMap.get(conn.targetId);
        if (fromNodeId && toNodeId) {
          await prisma.connection.create({
            data: {
              id: crypto.randomUUID(),
              workflowId: createdWorkflow.id,
              fromNodeId,
              toNodeId,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }
      }

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
    if (params.contactIds?.length > 0 || params.dealIds?.length > 0) {
      return {
        success: true,
        message: "I'll summarise the mentioned records for you.",
        data: {
          contactIds: params.contactIds,
          dealIds: params.dealIds,
        },
      };
    }

    return {
      success: true,
      message:
        "What would you like me to summarise? You can mention a contact or deal using @.",
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
    if (params.contactIds?.length > 0) {
      return {
        success: true,
        message: `I'll draft an email for ${params.contactNames?.join(", ")}. What's the purpose of this email?`,
        requiresMoreInfo: true,
        missingFields: ["purpose"],
      };
    }

    return {
      success: true,
      message:
        "I can draft an email for you. Mention a contact using @ and tell me the purpose.",
      requiresMoreInfo: true,
    };
  },

  analyze: async (params, context) => {
    return {
      success: true,
      message:
        "What data would you like me to analyze? You can mention specific contacts, deals, or pipelines.",
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
  showContacts: async (params, context) => {
    if (!context.organizationId) {
      return {
        success: false,
        message: "Please select an organization to view contacts.",
      };
    }

    const where: any = { organizationId: context.organizationId };
    if (context.subaccountId) {
      where.subaccountId = context.subaccountId;
    }

    const contacts = await prisma.contact.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        companyName: true,
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    if (contacts.length === 0) {
      return {
        success: true,
        message: "No contacts found. Would you like to create one?",
        data: { contacts: [] },
      };
    }

    const contactList = contacts
      .map((c: { name: string; email: string | null }) => `• ${c.name}${c.email ? ` (${c.email})` : ""}`)
      .join("\n");

    return {
      success: true,
      message: `Here are your recent contacts:\n\n${contactList}`,
      data: { contacts },
    };
  },

  showDeals: async (params, context) => {
    if (!context.organizationId) {
      return {
        success: false,
        message: "Please select an organization to view deals.",
      };
    }

    const where: any = { organizationId: context.organizationId };
    if (context.subaccountId) {
      where.subaccountId = context.subaccountId;
    }

    const deals = await prisma.deal.findMany({
      where,
      select: {
        id: true,
        name: true,
        value: true,
        pipelineStage: {
          select: { name: true },
        },
      },
      take: 10,
      orderBy: { createdAt: "desc" },
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

    const where: any = { organizationId: context.organizationId };
    if (context.subaccountId) {
      where.subaccountId = context.subaccountId;
    }

    const pipelines = await prisma.pipeline.findMany({
      where,
      select: {
        id: true,
        name: true,
        pipelineStage: {
          select: { id: true },
        },
      },
      take: 10,
    });

    if (pipelines.length === 0) {
      return {
        success: true,
        message: "No pipelines found. Would you like to create one?",
        data: { pipelines: [] },
      };
    }

    const pipelineList = pipelines
      .map((p: { name: string; pipelineStage: { id: string }[] }) => `• ${p.name} (${p.pipelineStage.length} stages)`)
      .join("\n");

    return {
      success: true,
      message: `Here are your pipelines:\n\n${pipelineList}`,
      data: { pipelines },
    };
  },

  showWorkflows: async (params, context) => {
    const workflows = await prisma.workflows.findMany({
      where: {
        userId: context.userId,
        archived: false,
      },
      select: {
        id: true,
        name: true,
        description: true,
        archived: true,
      },
      take: 10,
    });

    if (workflows.length === 0) {
      return {
        success: true,
        message: "No workflows found. Would you like to create one?",
        data: { workflows: [] },
      };
    }

    const workflowList = workflows
      .map((w: { name: string }) => `• ${w.name}`)
      .join("\n");

    return {
      success: true,
      message: `Here are your workflows:\n\n${workflowList}`,
      data: { workflows },
    };
  },

  search: async (params, context) => {
    const rawMessage = params.rawMessage || "";

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
- type: string ("contacts", "deals", "pipelines", or "workflows")

Query: "${rawMessage}"

JSON:`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Route to the appropriate handler
        if (parsed.type === "contacts") {
          return handlers.queryContacts(params, context);
        } else if (parsed.type === "deals") {
          return handlers.queryDeals(params, context);
        } else if (parsed.type === "pipelines") {
          return handlers.showPipelines(params, context);
        } else if (parsed.type === "workflows") {
          // Show workflows with basic filtering
          const workflows = await prisma.workflows.findMany({
            where: {
              organizationId: context.organizationId,
              subaccountId: context.subaccountId || null,
            },
            take: 10,
            orderBy: { createdAt: "desc" },
          });

          return {
            success: true,
            message: `Found ${workflows.length} workflow${workflows.length !== 1 ? "s" : ""}`,
            data: { workflows },
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
  queryContacts: async (params, context) => {
    if (!context.organizationId) {
      return {
        success: false,
        message: "Please select an organization to query contacts.",
      };
    }

    const rawMessage = params.rawMessage || "";
    const filters = await extractContactFiltersFromNL(rawMessage);

    // Build Prisma where clause
    const where: any = {
      organizationId: context.organizationId,
    };
    if (context.subaccountId) {
      where.subaccountId = context.subaccountId;
    }

    // Company name filter (case-insensitive contains)
    if (filters.companyName) {
      where.companyName = {
        contains: filters.companyName,
        mode: "insensitive",
      };
    }

    // Name filter
    if (filters.name) {
      where.name = {
        contains: filters.name,
        mode: "insensitive",
      };
    }

    // Email filter
    if (filters.email) {
      where.email = {
        contains: filters.email,
        mode: "insensitive",
      };
    }

    // Type filter
    if (filters.type) {
      where.type = filters.type;
    }

    // Lifecycle stage filter
    if (filters.lifecycleStage) {
      where.lifecycleStage = filters.lifecycleStage;
    }

    // Date filters
    if (filters.createdOn) {
      const date = new Date(filters.createdOn);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.createdAt = {
        gte: date,
        lt: nextDay,
      };
    } else {
      if (filters.createdAfter) {
        where.createdAt = {
          ...where.createdAt,
          gte: new Date(filters.createdAfter),
        };
      }
      if (filters.createdBefore) {
        where.createdAt = {
          ...where.createdAt,
          lte: new Date(filters.createdBefore),
        };
      }
    }

    const contacts = await prisma.contact.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        companyName: true,
        type: true,
        lifecycleStage: true,
        createdAt: true,
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    if (contacts.length === 0) {
      // Build description of filters applied
      const filterDesc: string[] = [];
      if (filters.companyName) filterDesc.push(`from "${filters.companyName}"`);
      if (filters.name) filterDesc.push(`named "${filters.name}"`);
      if (filters.createdOn) filterDesc.push(`created on ${filters.createdOn}`);
      if (filters.createdAfter) filterDesc.push(`created after ${filters.createdAfter}`);
      if (filters.type) filterDesc.push(`of type ${filters.type}`);

      return {
        success: true,
        message: `No contacts found${filterDesc.length > 0 ? ` ${filterDesc.join(", ")}` : ""}.`,
        data: { contacts: [], filters },
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

    const contactsUrl = `/contacts${urlParams.toString() ? `?${urlParams.toString()}` : ""}`;

    // Build filter description
    const filterDesc: string[] = [];
    if (filters.companyName) filterDesc.push(`from "${filters.companyName}"`);
    if (filters.name) filterDesc.push(`named "${filters.name}"`);
    if (filters.createdOn) filterDesc.push(`created on ${filters.createdOn}`);
    if (filters.createdAfter) filterDesc.push(`created after ${filters.createdAfter}`);
    if (filters.type) filterDesc.push(`of type ${filters.type}`);

    return {
      success: true,
      message: `Found ${contacts.length} contact${contacts.length !== 1 ? "s" : ""}${filterDesc.length > 0 ? ` ${filterDesc.join(", ")}` : ""}`,
      data: { contacts, filters, url: contactsUrl },
    };
  },

  queryDeals: async (params, context) => {
    if (!context.organizationId) {
      return {
        success: false,
        message: "Please select an organization to query deals.",
      };
    }

    const rawMessage = params.rawMessage || "";
    const filters = await extractDealFiltersFromNL(rawMessage);

    // Build Prisma where clause
    const where: any = {
      organizationId: context.organizationId,
    };
    if (context.subaccountId) {
      where.subaccountId = context.subaccountId;
    }

    // Value filters
    if (filters.minValue !== undefined) {
      where.value = {
        ...where.value,
        gte: filters.minValue,
      };
    }
    if (filters.maxValue !== undefined) {
      where.value = {
        ...where.value,
        lte: filters.maxValue,
      };
    }

    // Currency filter
    if (filters.currency) {
      where.currency = filters.currency;
    }

    // Name filter
    if (filters.name) {
      where.name = {
        contains: filters.name,
        mode: "insensitive",
      };
    }

    // Pipeline filter - need to look up by name
    if (filters.pipelineName) {
      const pipelineWhere: any = {
        organizationId: context.organizationId,
        name: {
          contains: filters.pipelineName,
          mode: "insensitive",
        },
      };
      if (context.subaccountId) {
        pipelineWhere.subaccountId = context.subaccountId;
      }
      const pipeline = await prisma.pipeline.findFirst({
        where: pipelineWhere,
      });
      if (pipeline) {
        where.pipelineId = pipeline.id;
      }
    }

    // Stage filter - need to look up by name
    if (filters.stageName) {
      const stageWhere: any = {
        name: {
          contains: filters.stageName,
          mode: "insensitive",
        },
        pipeline: {
          organizationId: context.organizationId,
        },
      };
      if (context.subaccountId) {
        stageWhere.pipeline.subaccountId = context.subaccountId;
      }
      const stages = await prisma.pipelineStage.findMany({
        where: stageWhere,
      });
      if (stages.length > 0) {
        where.pipelineStageId = {
          in: stages.map((s) => s.id),
        };
      }
    }

    // Date filters (creation date)
    if (filters.createdOn) {
      const date = new Date(filters.createdOn);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.createdAt = {
        gte: date,
        lt: nextDay,
      };
    } else {
      if (filters.createdAfter) {
        where.createdAt = {
          ...where.createdAt,
          gte: new Date(filters.createdAfter),
        };
      }
      if (filters.createdBefore) {
        where.createdAt = {
          ...where.createdAt,
          lte: new Date(filters.createdBefore),
        };
      }
    }

    // Deadline filters
    if (filters.hasPassedDeadline) {
      // Deals with deadline before today (overdue/passed)
      where.deadline = {
        lt: new Date(),
      };
    } else if (filters.deadlineOn) {
      const date = new Date(filters.deadlineOn);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.deadline = {
        gte: date,
        lt: nextDay,
      };
    } else {
      if (filters.deadlineBefore) {
        where.deadline = {
          ...where.deadline,
          lte: new Date(filters.deadlineBefore),
        };
      }
      if (filters.deadlineAfter) {
        where.deadline = {
          ...where.deadline,
          gte: new Date(filters.deadlineAfter),
        };
      }
    }

    const deals = await prisma.deal.findMany({
      where,
      select: {
        id: true,
        name: true,
        value: true,
        currency: true,
        createdAt: true,
        deadline: true,
        pipeline: {
          select: { name: true },
        },
        pipelineStage: {
          select: { name: true },
        },
      },
      take: 50,
      orderBy: { createdAt: "desc" },
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
    if (filters.stageName && where.pipelineStageId?.in) {
      urlParams.set("stages", where.pipelineStageId.in.join(","));
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
