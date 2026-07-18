import type { Node, Edge } from "@xyflow/react";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import {
  buildVariableTree,
  exampleContexts,
} from "@/components/tiptap/build-variable-tree";
import { NodeType } from "@/db/enums";
import { getStudioNodeOutputExample } from "./studio-node-output-examples";

/**
 * Builds the available workflow context for a given node
 * by analyzing upstream nodes and their variable names
 */
export function buildNodeContext(
  currentNodeId: string,
  nodes: Node[],
  edges: Edge[],
  options?: {
    isBundle?: boolean;
    bundleInputs?: Array<{
      name: string;
      type: string;
      description?: string;
      defaultValue?: any;
    }>;
    bundleWorkflowName?: string;
    parentWorkflowContext?: Record<string, Record<string, any>>;
  },
): VariableItem[] {
  // Only expose nodes that execute on every path into the current node.
  const upstreamNodeIds = getGuaranteedUpstreamNodes(currentNodeId, edges);

  // Build context object from upstream nodes
  const context: Record<string, any> = {};

  for (const nodeId of upstreamNodeIds) {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    const nodeData = node.data as any;
    const variableName = nodeData?.variableName;

    if (!variableName) continue;

    // Get the example context for this node type
    const nodeType = node.type;
    const exampleContext = getExampleContextForNodeType(nodeType, nodeData);

    if (exampleContext) {
      context[variableName] = exampleContext;
    }
  }

  // Add bundle-specific context if we're inside a bundle workflow
  if (options?.isBundle) {
    // Add bundle inputs as top-level variables
    if (options.bundleInputs) {
      for (const input of options.bundleInputs) {
        // Use default value as example, or generate a placeholder based on type
        const exampleValue =
          input.defaultValue ?? getExampleValueForType(input.type);
        context[input.name] = exampleValue;
      }
    }

    // Add parent workflow variables directly at the root level
    // Each parent workflow becomes a top-level key
    if (
      options.parentWorkflowContext &&
      Object.keys(options.parentWorkflowContext).length > 0
    ) {
      // Merge parent workflow contexts directly into the root context
      for (const [workflowName, workflowVariables] of Object.entries(
        options.parentWorkflowContext,
      )) {
        context[workflowName] = workflowVariables;
      }
    } else if (options.bundleWorkflowName) {
      // Fallback: Add placeholder if no parent workflows exist yet
      context[options.bundleWorkflowName || "ParentWorkflowName"] = {
        nodeName1: {
          field1: "example value",
          field2: 123,
        },
        nodeName2: {
          result: "example result",
        },
      };
    }
  }

  // If no context at all, return empty array
  if (Object.keys(context).length === 0) {
    return [];
  }

  return buildVariableTree(context);
}

/**
 * Generate example value based on type string
 */
function getExampleValueForType(type: string): any {
  switch (type.toLowerCase()) {
    case "string":
      return "example text";
    case "number":
      return 42;
    case "boolean":
      return true;
    case "array":
      return ["item1", "item2"];
    case "object":
      return { key: "value" };
    case "date":
      return "2025-01-01T00:00:00.000Z";
    default:
      return "example value";
  }
}

/**
 * Get all node IDs that are upstream from the current node
 */
export function getGuaranteedUpstreamNodes(
  currentNodeId: string,
  edges: Edge[],
): string[] {
  const memo = new Map<string, Set<string>>();
  const visiting = new Set<string>();

  const visit = (nodeId: string): Set<string> => {
    const cached = memo.get(nodeId);
    if (cached) return cached;
    if (visiting.has(nodeId)) return new Set();
    visiting.add(nodeId);

    const predecessors = edges
      .filter((edge) => edge.target === nodeId)
      .map((edge) => edge.source);
    if (predecessors.length === 0) {
      visiting.delete(nodeId);
      const empty = new Set<string>();
      memo.set(nodeId, empty);
      return empty;
    }

    const predecessorSets = predecessors.map((predecessor) =>
      new Set([predecessor, ...visit(predecessor)]),
    );
    const guaranteed = new Set(
      [...(predecessorSets[0] || [])].filter((candidate) =>
        predecessorSets.every((set) => set.has(candidate)),
      ),
    );

    visiting.delete(nodeId);
    memo.set(nodeId, guaranteed);
    return guaranteed;
  };

  return [...visit(currentNodeId)];
}

/**
 * Get example context structure for a node type
 */
export function getExampleContextForNodeType(
  nodeType: string | undefined,
  nodeData: any,
): any {
  if (!nodeType) return null;

  const studioExample = getStudioNodeOutputExample(nodeType);
  if (studioExample) return studioExample;

  // Triggers
  if (nodeType === NodeType.GOOGLE_FORM_TRIGGER) {
    const baseContext = {
      formId: "example-id",
      formTitle: "Client Form",
      respondentEmail: "respondent@example.com",
      timestamp: "2025-01-01T00:00:00.000Z",
      responses: {} as Record<string, string>,
    };

    // If formFields are defined in nodeData, add them to responses
    if (nodeData?.formFields && Array.isArray(nodeData.formFields)) {
      nodeData.formFields.forEach((fieldName: string) => {
        baseContext.responses[fieldName] = `Example value for ${fieldName}`;
      });
    }

    return baseContext;
  }

  if (nodeType === NodeType.GOOGLE_CALENDAR_TRIGGER) {
    return exampleContexts.calendar.googleCalendar;
  }

  if (nodeType === NodeType.GMAIL_TRIGGER) {
    return {
      messageId: "msg-id",
      threadId: "thread-id",
      from: "sender@example.com",
      subject: "Email Subject",
      body: "Email body content",
      labels: ["INBOX", "UNREAD"],
    };
  }

  if (nodeType === NodeType.TELEGRAM_TRIGGER) {
    return {
      messageId: "123456",
      chatId: "789",
      text: "Message text",
      from: {
        id: "user-id",
        username: "username",
        firstName: "John",
        lastName: "Doe",
      },
    };
  }

  if (nodeType === NodeType.STRIPE_TRIGGER) {
    return {
      eventType: "payment_intent.succeeded",
      eventId: "evt_xxx",
      amount: 1000,
      currency: "usd",
      customer: "cus_xxx",
    };
  }

  if (nodeType === NodeType.MANUAL_TRIGGER) {
    return {
      triggeredAt: "2025-01-01T00:00:00.000Z",
      userId: "user-id",
    };
  }

  if (nodeType === NodeType.FORM_SUBMITTED_TRIGGER) {
    return {
      submission: {
        id: "submission-id",
        formId: nodeData?.formId || "form-id",
        formName: "Lead capture form",
        clientId: "client-id",
        submittedAt: "2026-07-16T12:00:00.000Z",
      },
      values: { email: "member@example.com", firstName: "Alex" },
    };
  }

  if (nodeType === NodeType.PRICING_OPTION_PURCHASED_TRIGGER) {
    return {
      purchase: {
        pricingOptionId: nodeData?.pricingOptionIds?.[0] || "pricing-option-id",
        pricingOptionName: "Unlimited monthly",
        paymentId: "payment-id",
        membershipId: "membership-id",
        clientId: "client-id",
        amount: "99.00",
        currency: "GBP",
        purchasedAt: "2026-07-16T12:00:00.000Z",
      },
    };
  }

  if (nodeType === NodeType.CLIENT_INACTIVITY_TRIGGER) {
    return {
      client: {
        id: "client-id",
        name: "Alex Member",
        email: "member@example.com",
      },
      daysInactive: nodeData?.days || 30,
      lastActivityAt: "2026-06-16T12:00:00.000Z",
      activityDimensions: nodeData?.activityDimensions || ["CRM_INTERACTION"],
    };
  }

  // CRM Executions
  if (
    nodeType === NodeType.CREATE_CLIENT ||
    nodeType === NodeType.UPDATE_CLIENT
  ) {
    return exampleContexts.client.client;
  }

  if (nodeType === NodeType.CREATE_DEAL || nodeType === NodeType.UPDATE_DEAL) {
    return exampleContexts.deal.deal;
  }

  // Calendar
  if (nodeType === NodeType.GOOGLE_CALENDAR_EXECUTION) {
    return {
      eventId: "event-id",
      summary: "Event Title",
      start: "2025-01-01T10:00:00Z",
      end: "2025-01-01T11:00:00Z",
      attendees: [],
    };
  }

  // Messaging
  if (nodeType === NodeType.GMAIL_EXECUTION) {
    return {
      messageId: "msg-id",
      threadId: "thread-id",
      success: true,
    };
  }

  if (nodeType === NodeType.TELEGRAM_EXECUTION) {
    return {
      messageId: "msg-id",
      success: true,
    };
  }

  if (nodeType === NodeType.DISCORD || nodeType === NodeType.SLACK) {
    return {
      messageId: "msg-id",
      channelId: "channel-id",
      success: true,
    };
  }

  // AI
  if (nodeType === NodeType.GEMINI) {
    return {
      response: "AI generated response",
      tokensUsed: 100,
    };
  }

  // Generic execution - return a simple object
  return {
    id: "result-id",
    success: true,
  };
}
