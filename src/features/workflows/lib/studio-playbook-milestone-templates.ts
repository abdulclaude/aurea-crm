import { NodeType } from "@/db/enums";

import {
  playbookEmail,
  playbookTask,
} from "./studio-playbook-template-helpers";
import type { StarterWorkflowTemplate } from "./studio-template-types";
import { connection, node } from "./studio-template-types";

function milestoneTemplate(
  count: number,
  withTask = false,
): StarterWorkflowTemplate {
  const clientId = "{{milestone.clientId}}";
  const suffix = withTask ? " and create a team recognition task" : "";
  return {
    slug: `playbook-${count}-class-milestone`,
    name: `Playbook: ${count}-class milestone`,
    description: `Celebrate a member by email when they reach ${count} attended classes${suffix}.`,
    nodes: [
      node("trigger", NodeType.MEMBER_CLASS_COUNT_TRIGGER, 0, 0, {
        variableName: "milestone",
        targetCount: count,
      }),
      playbookEmail(
        "email",
        300,
        clientId,
        `${count} classes completed`,
        `Congratulations on reaching ${count} classes. Your consistency is worth celebrating.`,
      ),
      ...(withTask
        ? [
            playbookTask(
              "task",
              600,
              clientId,
              `Recognise the ${count}-class milestone`,
              60,
              "MINUTES",
            ),
          ]
        : []),
    ],
    connections: [
      connection("trigger", "email"),
      ...(withTask ? [connection("email", "task")] : []),
    ],
  };
}

export const studioPlaybookMilestoneTemplates: StarterWorkflowTemplate[] = [
  milestoneTemplate(10),
  milestoneTemplate(25),
  milestoneTemplate(50),
  milestoneTemplate(100, true),
];
