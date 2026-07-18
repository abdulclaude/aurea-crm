import { NodeType } from "@/db/enums";

import type { TemplateNode } from "./studio-template-types";
import { node } from "./studio-template-types";

export function playbookEmail(
  key: string,
  x: number,
  clientId: string,
  subject: string,
  body: string,
): TemplateNode {
  return node(key, NodeType.SEND_EMAIL, x, 0, {
    variableName: `${key}Result`,
    purpose: "MARKETING",
    clientId,
    subject,
    html: `<p>${body}</p>`,
    text: body,
  });
}

export function playbookSms(
  key: string,
  x: number,
  clientId: string,
  message: string,
): TemplateNode {
  return node(key, NodeType.SEND_SMS, x, 0, { clientId, message });
}

export function playbookWait(
  key: string,
  x: number,
  duration: number,
  unit: "minutes" | "hours" | "days",
): TemplateNode {
  return node(key, NodeType.WAIT, x, 0, {
    variableName: `${key}Result`,
    duration,
    unit,
  });
}

export function playbookTask(
  key: string,
  x: number,
  clientId: string,
  title: string,
  dueAmount: number,
  dueUnit: "MINUTES" | "HOURS" | "DAYS",
): TemplateNode {
  return node(key, NodeType.CREATE_TASK, x, 0, {
    title,
    description:
      "Review the member record and complete the next personal follow-up.",
    dueAmount,
    dueUnit,
    priority: "MEDIUM",
    clientId,
    assigneeId: "",
    variableName: `${key}Result`,
  });
}
