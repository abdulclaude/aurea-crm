import { NodeType } from "@/db/enums";

import {
  playbookEmail,
  playbookSms,
  playbookTask,
  playbookWait,
} from "./studio-playbook-template-helpers";
import type { StarterWorkflowTemplate } from "./studio-template-types";
import { connection, node } from "./studio-template-types";

export const studioPlaybookRetentionTemplates: StarterWorkflowTemplate[] = [
  {
    slug: "playbook-win-back-sequence",
    name: "Playbook: win-back sequence",
    description:
      "Re-engage a member after configurable inactivity with alternating email and SMS over 100 days.",
    nodes: [
      node("trigger", NodeType.CLIENT_INACTIVITY_TRIGGER, 0, 0, {
        variableName: "inactivity",
        days: 30,
        activityDimensions: [
          "CRM_INTERACTION",
          "CLASS_ATTENDANCE",
          "SUCCESSFUL_PAYMENT",
        ],
      }),
      playbookEmail(
        "email1",
        300,
        "{{inactivity.client.id}}",
        "We miss seeing you",
        "It has been a while. Reply if you would like help finding an easy way back.",
      ),
      playbookWait("wait1", 600, 30, "days"),
      playbookSms(
        "sms1",
        900,
        "{{inactivity.client.id}}",
        "We would love to see you again. Reply if you want help choosing a return class.",
      ),
      playbookWait("wait2", 1200, 30, "days"),
      playbookEmail(
        "email2",
        1500,
        "{{inactivity.client.id}}",
        "A fresh start",
        "You can restart at your own pace. We can help you choose a suitable session.",
      ),
      playbookWait("wait3", 1800, 30, "days"),
      playbookSms(
        "sms2",
        2100,
        "{{inactivity.client.id}}",
        "Still thinking about returning? Reply here and we will make the next step simple.",
      ),
      playbookWait("wait4", 2400, 3, "days"),
      playbookEmail(
        "email3",
        2700,
        "{{inactivity.client.id}}",
        "Here when you are ready",
        "There is no pressure. The studio team is here whenever you are ready to return.",
      ),
      playbookWait("wait5", 3000, 7, "days"),
    ],
    connections: [
      connection("trigger", "email1"),
      connection("email1", "wait1"),
      connection("wait1", "sms1"),
      connection("sms1", "wait2"),
      connection("wait2", "email2"),
      connection("email2", "wait3"),
      connection("wait3", "sms2"),
      connection("sms2", "wait4"),
      connection("wait4", "email3"),
      connection("email3", "wait5"),
    ],
  },
  {
    slug: "playbook-membership-cancellation-follow-up",
    name: "Playbook: membership cancellation follow-up",
    description:
      "Acknowledge a cancellation, create a personal follow-up task, and close the loop by email.",
    nodes: [
      node("trigger", NodeType.MEMBERSHIP_CANCELLED_TRIGGER, 0, 0, {
        variableName: "cancelledMembership",
      }),
      playbookEmail(
        "email1",
        300,
        "{{cancelledMembership.clientId}}",
        "Your cancellation",
        "Your cancellation has been recorded. Reply if there is anything you would like us to review.",
      ),
      playbookWait("wait1", 600, 2, "days"),
      playbookTask(
        "task",
        900,
        "{{cancelledMembership.clientId}}",
        "Follow up on membership cancellation",
        24,
        "HOURS",
      ),
      playbookWait("wait2", 1200, 3, "days"),
      playbookEmail(
        "email2",
        1500,
        "{{cancelledMembership.clientId}}",
        "Thank you for being with us",
        "Thank you for your time with the studio. You are welcome back whenever the timing is right.",
      ),
      playbookWait("wait3", 1800, 2, "hours"),
    ],
    connections: [
      connection("trigger", "email1"),
      connection("email1", "wait1"),
      connection("wait1", "task"),
      connection("task", "wait2"),
      connection("wait2", "email2"),
      connection("email2", "wait3"),
    ],
  },
];
