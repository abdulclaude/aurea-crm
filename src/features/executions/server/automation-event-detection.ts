import { AutomationEventType, NodeType } from "@/db/enums";
import type { JsonObject, JsonValue } from "@/db/json";

export type WorkflowForAutomationEvents = {
  id: string;
  name: string;
  organizationId: string | null;
  locationId: string | null;
  Node: Array<{
    id: string;
    type: NodeType;
    data: JsonValue;
  }>;
};

export type TriggerNodeForAutomationEvents = {
  id: string;
  type: NodeType;
};

export type EventDraft = {
  type: AutomationEventType;
  name: string;
  clientId?: string;
  entityType?: string;
  entityId?: string;
  metadata?: JsonObject;
};

export function buildAutomationEventDrafts({
  workflow,
  triggerNode,
  context,
  triggerData,
  clientId,
}: {
  workflow: WorkflowForAutomationEvents;
  triggerNode: TriggerNodeForAutomationEvents;
  context: Record<string, unknown>;
  triggerData: Record<string, unknown>;
  clientId?: string;
}): EventDraft[] {
  const drafts = createTriggerEventDrafts(triggerNode, triggerData, clientId);

  if (hasLeadConversion(workflow.Node, context)) {
    drafts.push({
      type: AutomationEventType.LEAD_CONVERTED,
      name: "Lead converted to active member",
      clientId,
      entityType: "client",
      entityId: clientId,
    });
  }

  return [
    {
      type: AutomationEventType.WORKFLOW_COMPLETED,
      name: "Workflow completed",
      clientId,
      entityType: "workflow",
      entityId: workflow.id,
      metadata: {
        workflowName: workflow.name,
        triggerNodeType: triggerNode.type,
      },
    },
    ...drafts,
  ];
}

function createTriggerEventDrafts(
  triggerNode: TriggerNodeForAutomationEvents,
  triggerData: Record<string, unknown>,
  clientId?: string,
): EventDraft[] {
  switch (triggerNode.type) {
    case NodeType.MEMBERSHIP_CREATED_TRIGGER:
      return [event("MEMBERSHIP_SIGNUP", "Membership signup", "membership", triggerData.membershipId, clientId)];
    case NodeType.INTRO_OFFER_REDEEMED_TRIGGER:
      return [
        {
          ...event("INTRO_OFFER_REDEEMED", "Intro offer redeemed", "intro_offer_redemption", triggerData.redemptionId, clientId),
          metadata: {
            offerId: firstString(triggerData.offerId) ?? "",
            offerName: firstString(triggerData.offerName) ?? "",
          },
        },
      ];
    case NodeType.INTRO_OFFER_COMPLETED_TRIGGER:
      return [
        event(
          "INTRO_OFFER_COMPLETED",
          "Intro offer completed",
          "intro_offer_redemption",
          getNestedValue(triggerData, "introOffer.id"),
          clientId,
        ),
      ];
    case NodeType.REFERRAL_CONVERTED_TRIGGER:
      return [
        {
          ...event(
            "REFERRAL_CONVERTED",
            "Referral converted",
            "referral",
            triggerData.referralId,
            clientId,
          ),
          metadata: {
            programId: firstString(triggerData.programId) ?? "",
            referrerClientId:
              firstString(triggerData.referrerClientId) ?? "",
          },
        },
      ];
    case NodeType.MEMBER_CHECKED_IN_TRIGGER:
      return getCheckInEvents(triggerData, clientId);
    case NodeType.MEMBER_CLASS_COUNT_TRIGGER:
      return [
        {
          ...event("CLASS_MILESTONE", "Class milestone", "client", clientId, clientId),
          metadata: {
            attendanceCount: firstNumber(
              triggerData.attendanceCount,
              getNestedValue(triggerData, "client.attendanceCount"),
            ) ?? 0,
          },
        },
      ];
    case NodeType.BIRTHDAY_TRIGGER:
      return [event("BIRTHDAY", "Birthday automation", "client", clientId, clientId)];
    case NodeType.MEMBER_NO_SHOW_TRIGGER:
      return [event("NO_SHOW", "Member no-show", "booking", triggerData.bookingId, clientId)];
    case NodeType.WAITLIST_SPOT_OPENED_TRIGGER:
      return [event("WAITLIST_SPOT_OPENED", "Waitlist spot opened", "waitlist", triggerData.waitlistId, clientId)];
    case NodeType.MEMBERSHIP_EXPIRING_TRIGGER:
      return [event("MEMBERSHIP_EXPIRING", "Membership expiring", "membership", triggerData.membershipId, clientId)];
    case NodeType.MEMBERSHIP_CANCELLED_TRIGGER:
      return [event("MEMBERSHIP_CANCELLED", "Membership cancelled", "membership", triggerData.membershipId, clientId)];
    case NodeType.CLASS_BOOKED_TRIGGER:
      return [event("CLASS_BOOKED", "Class booked", "booking", triggerData.bookingId, clientId)];
    case NodeType.CLASS_CANCELLED_TRIGGER:
      return [event("CLASS_CANCELLED", "Class cancelled", "booking", triggerData.bookingId, clientId)];
    case NodeType.CLIENT_FIELD_CHANGED_TRIGGER:
      return firstString(triggerData.fieldName) === "tags"
        ? [event("TAG_CHANGED", "Client tags changed", "client", clientId, clientId)]
        : [];
    case NodeType.CLIENT_TAG_ADDED_TRIGGER:
      return [event("TAG_CHANGED", "Client tag added", "client", clientId, clientId)];
    case NodeType.CLIENT_TAG_REMOVED_TRIGGER:
      return [event("TAG_CHANGED", "Client tag removed", "client", clientId, clientId)];
    case NodeType.STUDIO_PAYMENT_SUCCEEDED_TRIGGER:
      return [
        event(
          "PAYMENT_SUCCEEDED",
          "Payment succeeded",
          "payment",
          getNestedValue(triggerData, "payment.id"),
          clientId,
        ),
      ];
    case NodeType.STUDIO_PAYMENT_FAILED_TRIGGER:
      return [
        event(
          "PAYMENT_FAILED",
          "Payment failed",
          "payment",
          getNestedValue(triggerData, "payment.id"),
          clientId,
        ),
      ];
    default:
      return [];
  }
}

function getCheckInEvents(
  triggerData: Record<string, unknown>,
  clientId?: string,
): EventDraft[] {
  const drafts: EventDraft[] = [];
  const attendanceCount = firstNumber(
    triggerData.attendanceCount,
    getNestedValue(triggerData, "client.attendanceCount"),
  );

  if (attendanceCount && attendanceCount >= 10 && attendanceCount % 10 === 0) {
    drafts.push({
      ...event("CLASS_MILESTONE", `${attendanceCount}-class milestone`, "client", clientId, clientId),
      metadata: { attendanceCount },
    });
  }

  if (
    getNestedValue(triggerData, "introOffer.completed") === true ||
    containsValue(triggerData, "completed", true)
  ) {
    drafts.push(event("INTRO_OFFER_COMPLETED", "Intro offer completed", "client", clientId, clientId));
  }

  return drafts;
}

function event(
  type: keyof typeof AutomationEventType,
  name: string,
  entityType: string,
  entityIdValue: unknown,
  clientId?: string,
): EventDraft {
  return {
    type: AutomationEventType[type],
    name,
    clientId,
    entityType,
    entityId: firstString(entityIdValue),
  };
}

function hasLeadConversion(
  nodes: WorkflowForAutomationEvents["Node"],
  context: Record<string, unknown>,
): boolean {
  return (
    nodes.some(
      (node) =>
        node.type === NodeType.UPDATE_CLIENT &&
        getNestedValue(getRecord(node.data), "acquisitionStage") === "ACTIVE",
    ) || containsValue(context, "acquisitionStage", "ACTIVE")
  );
}

function containsValue(
  value: unknown,
  key: string,
  expected: string | boolean,
): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsValue(item, key, expected));
  }

  const record = getRecord(value);
  if (!record) {
    return false;
  }

  if (record[key] === expected) {
    return true;
  }

  return Object.values(record).some((child) =>
    containsValue(child, key, expected),
  );
}

export function getNestedValue(value: unknown, path: string): unknown {
  const root = getRecord(value);
  if (!root) {
    return undefined;
  }

  return path.split(".").reduce<unknown>((current, key) => {
    const record = getRecord(current);
    return record ? record[key] : undefined;
  }, root);
}

export function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

export function getRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}
