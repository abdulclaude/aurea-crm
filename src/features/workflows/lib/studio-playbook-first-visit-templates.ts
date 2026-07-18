import { NodeType } from "@/db/enums";

import {
  playbookEmail,
  playbookSms,
  playbookTask,
  playbookWait,
} from "./studio-playbook-template-helpers";
import type { StarterWorkflowTemplate } from "./studio-template-types";
import { connection, node } from "./studio-template-types";

const purchaseClientId = "{{purchase.purchase.clientId}}";
const milestoneClientId = "{{milestone.clientId}}";
const checkInClientId = "{{firstClass.clientId}}";

export const studioPlaybookFirstVisitTemplates: StarterWorkflowTemplate[] = [
  {
    slug: "playbook-first-class-review-request",
    name: "Playbook: review request after first class",
    description:
      "Ask for a public review by SMS when a member reaches their first attended class.",
    nodes: [
      node("trigger", NodeType.MEMBER_CLASS_COUNT_TRIGGER, 0, 0, {
        variableName: "milestone",
        targetCount: 1,
      }),
      playbookSms(
        "sms",
        300,
        milestoneClientId,
        "Thanks for joining us. If you enjoyed your visit, we would appreciate an honest review: [review link]",
      ),
    ],
    connections: [connection("trigger", "sms")],
  },
  {
    slug: "playbook-first-purchase-follow-up",
    name: "Playbook: first purchase follow-up",
    description:
      "Create a personal task, then run a five-touch email and SMS follow-up over 24 days.",
    nodes: [
      node("trigger", NodeType.PRICING_OPTION_PURCHASED_TRIGGER, 0, 0, {
        pricingOptionIds: [],
        variableName: "purchase",
      }),
      playbookTask(
        "task",
        300,
        purchaseClientId,
        "Welcome the new purchaser",
        24,
        "HOURS",
      ),
      playbookWait("wait1", 600, 6, "days"),
      playbookEmail(
        "email1",
        900,
        purchaseClientId,
        "Getting started",
        "Your purchase is ready. Reply if you would like help booking the right first session.",
      ),
      playbookWait("wait2", 1200, 5, "days"),
      playbookEmail(
        "email2",
        1500,
        purchaseClientId,
        "Build a routine that fits",
        "Choose a schedule you can repeat, and ask us for a recommendation if needed.",
      ),
      playbookWait("wait3", 1800, 4, "days"),
      playbookSms(
        "sms",
        2100,
        purchaseClientId,
        "How is everything going? Reply here if you need help with your next booking.",
      ),
      playbookWait("wait4", 2400, 4, "days"),
      playbookEmail(
        "email3",
        2700,
        purchaseClientId,
        "Keep the momentum",
        "Small, consistent sessions add up. We are here if you need support.",
      ),
      playbookWait("wait5", 3000, 5, "days"),
      playbookEmail(
        "email4",
        3300,
        purchaseClientId,
        "Plan your next visit",
        "Take a look at the schedule and choose the next session that works for you.",
      ),
    ],
    connections: [
      connection("trigger", "task"),
      connection("task", "wait1"),
      connection("wait1", "email1"),
      connection("email1", "wait2"),
      connection("wait2", "email2"),
      connection("email2", "wait3"),
      connection("wait3", "sms"),
      connection("sms", "wait4"),
      connection("wait4", "email3"),
      connection("email3", "wait5"),
      connection("wait5", "email4"),
    ],
  },
  {
    slug: "playbook-first-class-follow-up",
    name: "Playbook: first class follow-up",
    description:
      "Follow a verified first check-in with alternating SMS and email touchpoints across five days.",
    nodes: [
      node("trigger", NodeType.MEMBER_CHECKED_IN_TRIGGER, 0, 0, {
        variableName: "firstClass",
        firstCheckInOnly: true,
      }),
      playbookSms(
        "sms1",
        300,
        checkInClientId,
        "Thanks for coming to your first class. Reply and tell us how it felt.",
      ),
      playbookWait("wait1", 600, 2, "days"),
      playbookEmail(
        "email",
        900,
        checkInClientId,
        "After your first class",
        "Recovery and consistency both matter. Book your next session when you are ready.",
      ),
      playbookWait("wait2", 1200, 2, "days"),
      playbookSms(
        "sms2",
        1500,
        checkInClientId,
        "Ready for the next session? Reply if you want help choosing a class.",
      ),
      playbookWait("wait3", 1800, 24, "hours"),
    ],
    connections: [
      connection("trigger", "sms1"),
      connection("sms1", "wait1"),
      connection("wait1", "email"),
      connection("email", "wait2"),
      connection("wait2", "sms2"),
      connection("sms2", "wait3"),
    ],
  },
];
