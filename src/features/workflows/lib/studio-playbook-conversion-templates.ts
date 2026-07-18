import { NodeType } from "@/db/enums";

import {
  playbookEmail,
  playbookTask,
  playbookWait,
} from "./studio-playbook-template-helpers";
import type { StarterWorkflowTemplate } from "./studio-template-types";
import { connection, node } from "./studio-template-types";

const clientId = "{{purchase.purchase.clientId}}";

export const studioPlaybookConversionTemplates: StarterWorkflowTemplate[] = [
  {
    slug: "playbook-intro-offer-to-membership",
    name: "Playbook: intro offer to membership",
    description:
      "Guide an intro-offer purchaser toward membership with four timed emails and a personal task.",
    nodes: [
      node("trigger", NodeType.PRICING_OPTION_PURCHASED_TRIGGER, 0, 0, {
        pricingOptionIds: [],
        variableName: "purchase",
      }),
      playbookEmail(
        "email1",
        300,
        clientId,
        "Make the most of your intro",
        "Book the sessions that fit your week and reply if you want help planning them.",
      ),
      playbookWait("wait1", 600, 5, "days"),
      playbookEmail(
        "email2",
        900,
        clientId,
        "Keep your momentum",
        "A consistent schedule makes progress easier. We can recommend a membership when you are ready.",
      ),
      playbookWait("wait2", 1200, 4, "days"),
      playbookEmail(
        "email3",
        1500,
        clientId,
        "What comes after your intro",
        "Compare the available memberships and choose the rhythm that suits you.",
      ),
      playbookWait("wait3", 1800, 5, "days"),
      playbookEmail(
        "email4",
        2100,
        clientId,
        "Continue your routine",
        "Your team can help you move from the intro offer into a sustainable plan.",
      ),
      playbookWait("wait4", 2400, 3, "days"),
      playbookTask(
        "task",
        2700,
        clientId,
        "Follow up on intro-offer conversion",
        24,
        "HOURS",
      ),
      playbookEmail(
        "email5",
        3000,
        clientId,
        "Need help choosing?",
        "Reply with your preferred weekly schedule and we will recommend a suitable option.",
      ),
    ],
    connections: [
      connection("trigger", "email1"),
      connection("email1", "wait1"),
      connection("wait1", "email2"),
      connection("email2", "wait2"),
      connection("wait2", "email3"),
      connection("email3", "wait3"),
      connection("wait3", "email4"),
      connection("email4", "wait4"),
      connection("wait4", "task"),
      connection("task", "email5"),
    ],
  },
];
