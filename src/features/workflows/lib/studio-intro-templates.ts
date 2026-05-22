import { NodeType } from "@/db/enums";

import type { StarterWorkflowTemplate } from "./studio-template-types";
import { connection, node } from "./studio-template-types";

export const studioIntroTemplates: StarterWorkflowTemplate[] = [
  {
    slug: "intro-offer-conversion",
    name: "Intro offer conversion follow-up",
    description:
      "Tag intro-offer members, start trial stage, then follow up after their first day.",
    nodes: [
      node("trigger", NodeType.INTRO_OFFER_REDEEMED_TRIGGER, 0, 0, {
        variableName: "redeemedOffer",
      }),
      node("trial", NodeType.UPDATE_CLIENT, 300, 0, {
        variableName: "trialMember",
        clientId: "{{redeemedOffer.clientId}}",
        acquisitionStage: "TRIAL",
        tags: "intro-offer,trial",
      }),
      node("wait", NodeType.WAIT, 600, 0, {
        variableName: "oneDay",
        duration: 1,
        unit: "days",
      }),
      node("sms", NodeType.SEND_SMS, 900, 0, {
        clientId: "{{redeemedOffer.clientId}}",
        message:
          "Hope you are enjoying your intro offer. Reply here if you want help choosing your next class.",
      }),
    ],
    connections: [
      connection("trigger", "trial"),
      connection("trial", "wait"),
      connection("wait", "sms"),
    ],
  },
  {
    slug: "intro-offer-completed",
    name: "Intro offer completed conversion ask",
    description:
      "When a check-in completes intro offer credits, ask the member to convert.",
    nodes: [
      node("trigger", NodeType.INTRO_OFFER_COMPLETED_TRIGGER, 0, 0, {
        variableName: "completedIntro",
      }),
      node("tag", NodeType.ADD_TAG_TO_CLIENT, 300, 0, {
        variableName: "completedIntroMember",
        clientId: "{{completedIntro.clientId}}",
        tag: "intro-completed",
      }),
      node("sms", NodeType.SEND_SMS, 600, 0, {
        clientId: "{{completedIntro.clientId}}",
        message:
          "You have completed your intro offer. Want us to recommend the best membership for your schedule?",
      }),
    ],
    connections: [
      connection("trigger", "tag"),
      connection("tag", "sms"),
    ],
  },
  {
    slug: "ten-class-milestone",
    name: "10-class milestone reward",
    description:
      "When a member checks in, branch on visit count and reward their 10-class milestone.",
    nodes: [
      node("trigger", NodeType.MEMBER_CLASS_COUNT_TRIGGER, 0, 0, {
        variableName: "milestone",
        targetCount: 10,
      }),
      node("tag", NodeType.ADD_TAG_TO_CLIENT, 300, 0, {
        variableName: "milestoneMember",
        clientId: "{{milestone.clientId}}",
        tag: "10-class-milestone",
      }),
      node("points", NodeType.AWARD_LOYALTY_POINTS, 600, 0, {
        clientId: "{{milestone.clientId}}",
        points: 100,
        type: "EARNED",
        description: "10-class milestone reward",
      }),
      node("sms", NodeType.SEND_SMS, 900, 0, {
        clientId: "{{milestone.clientId}}",
        message:
          "You hit 10 classes. We added a small reward to your account. Keep going.",
      }),
    ],
    connections: [
      connection("trigger", "tag"),
      connection("tag", "points"),
      connection("points", "sms"),
    ],
  },
];
