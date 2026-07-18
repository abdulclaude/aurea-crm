import { z } from "zod";

import { AutomationEventType, NodeType } from "@/db/enums";

const automationEventTypeValues = Object.values(AutomationEventType) as [
  AutomationEventType,
  ...AutomationEventType[],
];
const nodeTypeValues = Object.values(NodeType) as [NodeType, ...NodeType[]];

export const automationEventTypeSchema = z.enum(automationEventTypeValues);
export const automationSourceNodeTypeSchema = z.enum(nodeTypeValues);

export const automationEventExplorerInputSchema = z.object({
  days: z.number().int().min(1).max(365).default(30),
  eventType: automationEventTypeSchema.nullable().default(null),
  workflowId: z.string().min(1).max(128).nullable().default(null),
  clientId: z.string().min(1).max(128).nullable().default(null),
  clientSearch: z.string().trim().max(100).default(""),
  sourceNodeType: automationSourceNodeTypeSchema.nullable().default(null),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(10).max(100).default(25),
});

export type AutomationEventExplorerInput = z.infer<
  typeof automationEventExplorerInputSchema
>;

export const AUTOMATION_CONVERSION_EVENT_TYPES = new Set<AutomationEventType>([
  AutomationEventType.MEMBERSHIP_SIGNUP,
  AutomationEventType.INTRO_OFFER_REDEEMED,
  AutomationEventType.INTRO_OFFER_COMPLETED,
  AutomationEventType.CLASS_MILESTONE,
  AutomationEventType.LEAD_CONVERTED,
  AutomationEventType.REFERRAL_CONVERTED,
]);

export function isAutomationConversionEvent(
  type: AutomationEventType,
): boolean {
  return AUTOMATION_CONVERSION_EVENT_TYPES.has(type);
}

export function summarizeAutomationSignalTypes(
  types: readonly AutomationEventType[],
) {
  const summary = {
    membershipSignupAutomations: 0,
    introOfferAutomations: 0,
    leadToMemberConversions: 0,
    classMilestoneAutomations: 0,
    referralConversions: 0,
    recoverySignals: 0,
  };

  for (const type of types) {
    if (type === AutomationEventType.MEMBERSHIP_SIGNUP) {
      summary.membershipSignupAutomations += 1;
    } else if (
      type === AutomationEventType.INTRO_OFFER_REDEEMED ||
      type === AutomationEventType.INTRO_OFFER_COMPLETED
    ) {
      summary.introOfferAutomations += 1;
    } else if (type === AutomationEventType.CLASS_MILESTONE) {
      summary.classMilestoneAutomations += 1;
    } else if (type === AutomationEventType.LEAD_CONVERTED) {
      summary.leadToMemberConversions += 1;
    } else if (type === AutomationEventType.REFERRAL_CONVERTED) {
      summary.referralConversions += 1;
    } else if (
      type === AutomationEventType.PAYMENT_FAILED ||
      type === AutomationEventType.NO_SHOW ||
      type === AutomationEventType.MEMBERSHIP_CANCELLED
    ) {
      summary.recoverySignals += 1;
    }
  }

  return summary;
}

export function countConvertedSuccessfulExecutions(
  events: ReadonlyArray<{
    executionId: string | null;
    type: AutomationEventType;
  }>,
  successfulExecutionIds: ReadonlySet<string>,
): number {
  const converted = new Set<string>();
  for (const event of events) {
    if (
      event.executionId &&
      successfulExecutionIds.has(event.executionId) &&
      isAutomationConversionEvent(event.type)
    ) {
      converted.add(event.executionId);
    }
  }
  return converted.size;
}
