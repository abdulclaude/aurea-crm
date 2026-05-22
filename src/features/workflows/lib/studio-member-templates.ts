import { NodeType } from "@/db/enums";

import type { StarterWorkflowTemplate } from "./studio-template-types";
import { connection, node } from "./studio-template-types";

export const studioMemberTemplates: StarterWorkflowTemplate[] = [
  {
    slug: "birthday-touchpoint",
    name: "Birthday touchpoint",
    description:
      "On a member birthday, tag the member, add loyalty points, and send a warm SMS.",
    nodes: [
      node("trigger", NodeType.BIRTHDAY_TRIGGER, 0, 0, {
        variableName: "birthday",
      }),
      node("tag", NodeType.ADD_TAG_TO_CLIENT, 300, 0, {
        variableName: "birthdayMember",
        clientId: "{{birthday.clientId}}",
        tag: "birthday",
      }),
      node("points", NodeType.AWARD_LOYALTY_POINTS, 600, 0, {
        clientId: "{{birthday.clientId}}",
        points: 50,
        type: "EARNED",
        description: "Birthday reward",
      }),
      node("sms", NodeType.SEND_SMS, 900, 0, {
        clientId: "{{birthday.clientId}}",
        message:
          "Happy birthday, {{birthday.client.name}}. We added a small birthday reward to your account.",
      }),
    ],
    connections: [
      connection("trigger", "tag"),
      connection("tag", "points"),
      connection("points", "sms"),
    ],
  },
  {
    slug: "new-member-welcome",
    name: "New member welcome and onboarding",
    description:
      "When a membership starts, mark the client active, tag them, and send a welcome SMS.",
    nodes: [
      node("trigger", NodeType.MEMBERSHIP_CREATED_TRIGGER, 0, 0, {
        variableName: "membership",
      }),
      node("activate", NodeType.UPDATE_CLIENT, 300, 0, {
        variableName: "member",
        clientId: "{{membership.clientId}}",
        acquisitionStage: "ACTIVE",
        tags: "active-member,onboarding",
      }),
      node("welcome", NodeType.SEND_SMS, 600, 0, {
        clientId: "{{membership.clientId}}",
        message:
          "Welcome to the studio, {{membership.client.name}}. Your {{membership.planName}} is active. Book your first class when you are ready.",
      }),
    ],
    connections: [
      connection("trigger", "activate"),
      connection("activate", "welcome"),
    ],
  },
  {
    slug: "membership-expiring-renewal",
    name: "Membership expiring renewal nudge",
    description:
      "When a membership is close to expiry, tag the member and send a renewal nudge.",
    nodes: [
      node("trigger", NodeType.MEMBERSHIP_EXPIRING_TRIGGER, 0, 0, {
        variableName: "expiringMembership",
      }),
      node("tag", NodeType.ADD_TAG_TO_CLIENT, 300, 0, {
        variableName: "renewalMember",
        clientId: "{{expiringMembership.clientId}}",
        tag: "renewal-due",
      }),
      node("sms", NodeType.SEND_SMS, 600, 0, {
        clientId: "{{expiringMembership.clientId}}",
        message:
          "Your membership is coming up for renewal. Reply here if you want us to help pick the best plan.",
      }),
    ],
    connections: [connection("trigger", "tag"), connection("tag", "sms")],
  },
  {
    slug: "membership-cancelled-winback",
    name: "Cancelled membership win-back",
    description:
      "When a membership is cancelled, mark churn risk and follow up after two days.",
    nodes: [
      node("trigger", NodeType.MEMBERSHIP_CANCELLED_TRIGGER, 0, 0, {
        variableName: "cancelledMembership",
      }),
      node("tag", NodeType.ADD_TAG_TO_CLIENT, 300, 0, {
        variableName: "churnRiskMember",
        clientId: "{{cancelledMembership.clientId}}",
        tag: "churn-risk",
      }),
      node("wait", NodeType.WAIT, 600, 0, {
        variableName: "twoDays",
        duration: 2,
        unit: "days",
      }),
      node("sms", NodeType.SEND_SMS, 900, 0, {
        clientId: "{{cancelledMembership.clientId}}",
        message:
          "We are sorry to see you go. Reply here if there is anything we can fix or if you want a lighter plan.",
      }),
    ],
    connections: [
      connection("trigger", "tag"),
      connection("tag", "wait"),
      connection("wait", "sms"),
    ],
  },
];
