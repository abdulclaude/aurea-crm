import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { aiLog, client as clientTable, deal as dealTable, pipeline as pipelineTable, pipelineStage, workflows as workflowTable } from "@/db/schema";
import { routeIntent } from "@/lib/ai/intent-router";
import { executeAction } from "@/lib/ai/action-handlers";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

interface EntityReference {
  type: string;
  id: string;
  name: string;
}

interface ChatRequest {
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  html?: string;
  entities?: EntityReference[];
  locationId?: string;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchEntityDetails(
  entities: EntityReference[],
  locationId: string
) {
  const details: Record<string, unknown>[] = [];

  for (const entity of entities) {
    try {
      switch (entity.type) {
        case "client": {
          const client = await db.query.client.findFirst({
            where: and(eq(clientTable.id, entity.id), eq(clientTable.locationId, locationId)),
            with: {
              clientAssignees: {
                with: {
                  locationMember: {
                    with: { user: true },
                  },
                },
              },
              dealClients: {
                with: { deal: true },
              },
            },
          });
          if (client) {
            details.push({
              entityType: "client",
              ...client,
              assignees: client.clientAssignees.map(
                (a) => a.locationMember.user?.name
              ),
              deals: client.dealClients.map((d) => d.deal.name),
            });
          }
          break;
        }
        case "deal": {
          const deal = await db.query.deal.findFirst({
            where: and(eq(dealTable.id, entity.id), eq(dealTable.locationId, locationId)),
            with: {
              pipeline: true,
              pipelineStage: true,
              dealAssignees: {
                with: {
                  locationMember: {
                    with: { user: true },
                  },
                },
              },
              dealClients: {
                with: { client: true },
              },
            },
          });
          if (deal) {
            details.push({
              type: "deal",
              ...deal,
              pipelineName: deal.pipeline?.name,
              stageName: deal.pipelineStage?.name,
              members: deal.dealAssignees.map((m) => m.locationMember.user?.name),
              clients: deal.dealClients.map((c) => c.client.name),
            });
          }
          break;
        }
        case "pipeline": {
          const pipeline = await db.query.pipeline.findFirst({
            where: and(eq(pipelineTable.id, entity.id), eq(pipelineTable.locationId, locationId)),
            with: {
              pipelineStages: {
                orderBy: asc(pipelineStage.position),
              },
              deals: { columns: { id: true } },
            },
          });
          if (pipeline) {
            details.push({
              type: "pipeline",
              ...pipeline,
              dealCount: pipeline.deals.length,
            });
          }
          break;
        }
        case "workflow": {
          const workflow = await db.query.workflows.findFirst({
            where: and(eq(workflowTable.id, entity.id), eq(workflowTable.locationId, locationId)),
            with: {
              nodes: true,
              executions: { columns: { id: true } },
            },
          });
          if (workflow) {
            details.push({
              type: "workflow",
              id: workflow.id,
              name: workflow.name,
              description: workflow.description,
              archived: workflow.archived,
              isTemplate: workflow.isTemplate,
              nodeCount: workflow.nodes.length,
              executionCount: workflow.executions.length,
              nodeTypes: workflow.nodes.map((n) => n.type),
            });
          }
          break;
        }
      }
    } catch (error) {
      console.error(`Failed to fetch ${entity.type} ${entity.id}:`, error);
    }
  }

  return details;
}

const SYSTEM_PROMPT = `You are an AI assistant for Aurea CRM, a workflow automation and customer relationship management platform. Your role is to help users manage their clients, deals, pipelines, and workflows effectively.

## Your Capabilities
- Answer questions about CRM data (clients, deals, pipelines, workflows)
- Provide insights and analysis based on the data
- Help users understand their sales pipeline and customer relationships
- Suggest actions and next steps for deals and clients
- Explain workflow automations and their purposes

## Guidelines
1. **Be Concise**: Keep responses practical and to the point. CRM users are busy.
2. **Use Context**: Always reference the provided context (vector search results and entity details) when answering.
3. **Ask for Clarification**: If a question is ambiguous, ask for clarification rather than guessing.
4. **Be Honest**: If you don't have enough information, say so clearly.
5. **Suggest Actions**: When appropriate, suggest concrete next steps the user can take.
6. **Format Responses**: Use markdown for better readability (lists, bold for emphasis, etc.)

## Entity Types
- **Clients**: People or companies in the CRM with details like name, email, company, lifecycle stage, score
- **Deals**: Sales opportunities with value, pipeline stage, deadline, associated clients
- **Pipelines**: Sales processes with stages (e.g., Lead In → Qualified → Proposal → Won/Lost)
- **Workflows**: Automated processes triggered by events (e.g., "When client created, send email")

When referencing specific entities, use their names naturally in your response.`;

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body: ChatRequest = await request.json();
    const {
      messages: incomingMessages,
      html,
      entities = [],
      locationId,
    } = body;

    // Get the last user message
    const lastUserMessage = incomingMessages
      .filter((m) => m.role === "user")
      .pop();
    if (!lastUserMessage) {
      return new Response(JSON.stringify({ error: "No user message found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Convert HTML to plain text if provided
    const plainText = html ? htmlToPlainText(html) : lastUserMessage.content;

    // Get organization context from session
    const activeOrgId = session.session.activeOrganizationId || null;

    // Route the intent to see if this is a command
    const routeResult = await routeIntent(plainText, entities);

    console.log("[Chat API] Plain text:", plainText);
    console.log(
      "[Chat API] Route result:",
      routeResult
        ? {
            intent: routeResult.intent.name,
            confidence: routeResult.confidence,
          }
        : null
    );
    console.log("[Chat API] Context:", {
      userId: session.user.id,
      orgId: activeOrgId,
      locationId,
    });

    // If we have a high-confidence intent, execute the action
    if (routeResult && routeResult.confidence > 0.4) {
      // Create a log entry for this action
      const [log] = await db
        .insert(aiLog)
        .values({
          id: crypto.randomUUID(),
          title: routeResult.intent.description || routeResult.intent.name,
          intent: routeResult.intent.name,
          userMessage: plainText,
          status: "RUNNING",
          userId: session.user.id,
          organizationId: activeOrgId,
          locationId: locationId || null,
          createdAt: new Date(),
        })
        .returning({ id: aiLog.id });

      let actionResult: Awaited<ReturnType<typeof executeAction>>;
      try {
        actionResult = await executeAction(routeResult, {
          userId: session.user.id,
          organizationId: activeOrgId,
          locationId: locationId || null,
        });

        // Update log with result
        await db
          .update(aiLog)
          .set({
            status: actionResult.success ? "COMPLETED" : "FAILED",
            error: actionResult.success ? null : actionResult.message,
            result: actionResult.data || null,
            completedAt: new Date(),
            description: actionResult.message,
          })
          .where(eq(aiLog.id, log.id));
      } catch (error) {
        // Update log with error
        await db
          .update(aiLog)
          .set({
            status: "FAILED",
            error: error instanceof Error ? error.message : "Unknown error",
            completedAt: new Date(),
          })
          .where(eq(aiLog.id, log.id));
        throw error;
      }

      console.log("[Chat API] Action result:", actionResult);

      // If action doesn't require more info, return the result directly
      if (!actionResult.requiresMoreInfo) {
        // Return as a streaming response for consistency
        const result = streamText({
          model: google("gemini-2.0-flash"),
          system: SYSTEM_PROMPT,
          messages: [
            ...incomingMessages.slice(0, -1).map((msg) => ({
              role: msg.role as "user" | "assistant",
              content: msg.content,
            })),
            {
              role: "user" as const,
              content: plainText,
            },
            {
              role: "assistant" as const,
              content: actionResult.message,
            },
          ],
        });
        return result.toTextStreamResponse();
      }

      // For actions requiring more info, include the action context in the AI prompt
      const actionContext = `\n\n---\nACTION CONTEXT:\nThe user wants to: ${
        routeResult.intent.description
      }\nCommand: ${routeResult.intent.command}\nCurrent status: ${
        actionResult.message
      }\n${
        actionResult.missingFields
          ? `Missing information: ${actionResult.missingFields.join(", ")}`
          : ""
      }\n---\n\n`;

      const result = streamText({
        model: google("gemini-2.0-flash"),
        system: SYSTEM_PROMPT,
        messages: [
          ...incomingMessages.slice(0, -1).map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
          {
            role: "user" as const,
            content: actionContext + plainText,
          },
        ],
      });
      return result.toTextStreamResponse();
    }

    // Fetch details for explicitly referenced entities (only if location context)
    const entityDetails =
      entities.length > 0 && locationId
        ? await fetchEntityDetails(entities, locationId)
        : [];

    // Build context message
    const contextParts: string[] = [];

    if (entityDetails.length > 0) {
      contextParts.push(
        "## Referenced Entities\n" + JSON.stringify(entityDetails, null, 2)
      );
    }

    const contextMessage =
      contextParts.length > 0
        ? `\n\n---\nCONTEXT:\n${contextParts.join("\n\n")}\n---\n\n`
        : "";

    // Build messages array from conversation history
    const messages = incomingMessages.slice(0, -1).map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    // Add the last message with context
    messages.push({
      role: "user" as const,
      content: contextMessage + plainText,
    });

    // Stream the response
    const result = streamText({
      model: google("gemini-2.0-flash"),
      system: SYSTEM_PROMPT,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
