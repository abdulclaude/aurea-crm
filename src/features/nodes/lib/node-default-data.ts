import { NodeType } from "@/db/enums";
import type { JsonObject } from "@/db/json";

const STUDIO_TRIGGER_VARIABLE_NAMES: Partial<Record<NodeType, string>> = {
  [NodeType.FORM_SUBMITTED_TRIGGER]: "formSubmission",
  [NodeType.PRICING_OPTION_PURCHASED_TRIGGER]: "purchase",
  [NodeType.CLIENT_INACTIVITY_TRIGGER]: "inactivity",
  [NodeType.BIRTHDAY_TRIGGER]: "birthday",
  [NodeType.CLASS_BOOKED_TRIGGER]: "bookedClass",
  [NodeType.CLASS_CANCELLED_TRIGGER]: "cancelledClass",
  [NodeType.MEMBER_CHECKED_IN_TRIGGER]: "checkIn",
  [NodeType.MEMBER_NO_SHOW_TRIGGER]: "noShow",
  [NodeType.MEMBERSHIP_CREATED_TRIGGER]: "newMembership",
  [NodeType.MEMBERSHIP_EXPIRING_TRIGGER]: "expiringMembership",
  [NodeType.MEMBERSHIP_CANCELLED_TRIGGER]: "cancelledMembership",
  [NodeType.WAITLIST_SPOT_OPENED_TRIGGER]: "waitlistSpot",
  [NodeType.INTRO_OFFER_REDEEMED_TRIGGER]: "redeemedOffer",
  [NodeType.INTRO_OFFER_COMPLETED_TRIGGER]: "completedOffer",
  [NodeType.REFERRAL_CONVERTED_TRIGGER]: "referral",
  [NodeType.MEMBER_CLASS_COUNT_TRIGGER]: "milestone",
  [NodeType.CLIENT_TAG_ADDED_TRIGGER]: "tagAdded",
  [NodeType.CLIENT_TAG_REMOVED_TRIGGER]: "tagRemoved",
  [NodeType.STUDIO_PAYMENT_SUCCEEDED_TRIGGER]: "payment",
  [NodeType.STUDIO_PAYMENT_FAILED_TRIGGER]: "payment",
};

export function getNodeDefaultData(nodeType: NodeType): JsonObject {
  if (nodeType === NodeType.STUDIO_CLASS_ACTION) {
    return {
      operation: "CHECK_IN",
      classSource: "VARIABLE",
      classId: "{{triggerData.classId}}",
      clientSource: "VARIABLE",
      clientId: "{{triggerData.clientId}}",
      variableName: "studioAction",
    };
  }
  const variableName = STUDIO_TRIGGER_VARIABLE_NAMES[nodeType];
  return variableName ? { variableName } : {};
}
