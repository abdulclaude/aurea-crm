import { NodeType } from "@/db/enums";

import {
  playbookEmail,
  playbookSms,
  playbookTask,
  playbookWait,
} from "./studio-playbook-template-helpers";
import type { StarterWorkflowTemplate } from "./studio-template-types";
import { connection, node } from "./studio-template-types";

const newClientId = "{{newClient.client.id}}";
const purchaseClientId = "{{purchase.purchase.clientId}}";

export const studioPlaybookWelcomeTemplates: StarterWorkflowTemplate[] = [
  {
    slug: "playbook-new-lead-welcome-series",
    name: "Playbook: new lead welcome series",
    description:
      "Create a prompt personal follow-up, then deliver a measured email and SMS welcome sequence.",
    nodes: [
      node("trigger", NodeType.CLIENT_CREATED_TRIGGER, 0, 0, {
        variableName: "newClient",
      }),
      playbookTask("task", 300, newClientId, "Call the new lead", 24, "HOURS"),
      playbookEmail(
        "email1",
        600,
        newClientId,
        "Welcome",
        "Thanks for getting in touch. We are here to help you choose the right next step.",
      ),
      playbookWait("wait1", 900, 7, "days"),
      playbookEmail(
        "email2",
        1200,
        newClientId,
        "Ready when you are",
        "Explore the studio at your own pace, and reply if you would like a recommendation.",
      ),
      playbookWait("wait2", 1500, 24, "hours"),
      playbookSms(
        "sms",
        1800,
        newClientId,
        "Hi {{newClient.client.name}}, reply here if you would like help finding a first class.",
      ),
      playbookWait("wait3", 2100, 24, "hours"),
      playbookEmail(
        "email3",
        2400,
        newClientId,
        "A simple way to begin",
        "Start with the class that best fits your schedule. We can help you choose.",
      ),
    ],
    connections: [
      connection("trigger", "task"),
      connection("task", "email1"),
      connection("email1", "wait1"),
      connection("wait1", "email2"),
      connection("email2", "wait2"),
      connection("wait2", "sms"),
      connection("sms", "wait3"),
      connection("wait3", "email3"),
    ],
  },
  {
    slug: "playbook-new-membership-welcome",
    name: "Playbook: new membership welcome",
    description:
      "Welcome a pricing-option purchaser by SMS, then check in twice during their first month.",
    nodes: [
      node("trigger", NodeType.PRICING_OPTION_PURCHASED_TRIGGER, 0, 0, {
        pricingOptionIds: [],
        variableName: "purchase",
      }),
      playbookSms(
        "sms",
        300,
        purchaseClientId,
        "Welcome. Your purchase is ready, and we can help you plan your first visits.",
      ),
      playbookWait("wait1", 600, 15, "days"),
      playbookEmail(
        "email1",
        900,
        purchaseClientId,
        "How is your first fortnight going?",
        "We hope you are settling in. Reply if you would like help with your schedule.",
      ),
      playbookWait("wait2", 1200, 15, "days"),
      playbookEmail(
        "email2",
        1500,
        purchaseClientId,
        "Your first month",
        "Thank you for being part of the studio. Let us know how we can support your next month.",
      ),
    ],
    connections: [
      connection("trigger", "sms"),
      connection("sms", "wait1"),
      connection("wait1", "email1"),
      connection("email1", "wait2"),
      connection("wait2", "email2"),
    ],
  },
];
