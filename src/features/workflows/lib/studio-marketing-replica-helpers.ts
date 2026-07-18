import { NodeType } from "@/db/enums";
import type { JsonObject } from "@/db/json";

import type {
  StarterWorkflowTemplate,
  TemplateConnection,
  TemplateNode,
} from "./studio-template-types";
import { connection, node } from "./studio-template-types";

export type ReplicaStepKind =
  | "trigger"
  | "email"
  | "sms"
  | "wait"
  | "condition"
  | "addTag"
  | "removeTag";

export type ReplicaStep = {
  kind: ReplicaStepKind;
  title: string;
  x: number;
  y: number;
  duration?: number;
  unit?: "minutes" | "hours" | "days";
  tags?: string[];
};

export type ReplicaEdge = readonly [
  source: number,
  target: number,
  branch?: "main" | "true" | "false",
];

type ReplicaJourneyInput = {
  slug: string;
  name: string;
  description: string;
  steps: readonly ReplicaStep[];
  edges: readonly ReplicaEdge[];
  trigger: {
    type: NodeType;
    data: JsonObject;
  };
  clientId: string;
};

export function buildReplicaJourney(
  input: ReplicaJourneyInput,
): StarterWorkflowTemplate {
  return {
    slug: input.slug,
    name: input.name,
    description: input.description,
    nodes: input.steps.map((step, index) =>
      buildStepNode(step, index, input.trigger, input.clientId),
    ),
    connections: input.edges.map(([source, target, branch = "main"]) =>
      connection(stepKey(source), stepKey(target), branch),
    ),
  };
}

function buildStepNode(
  step: ReplicaStep,
  index: number,
  trigger: ReplicaJourneyInput["trigger"],
  clientId: string,
): TemplateNode {
  const key = stepKey(index);
  const variablePrefix = `step${index}`;
  const position = { x: step.x, y: step.y };

  if (step.kind === "trigger") {
    return node(key, trigger.type, position.x, position.y, trigger.data);
  }
  if (step.kind === "wait") {
    return node(key, NodeType.WAIT, position.x, position.y, {
      actionName: step.title,
      variableName: `${variablePrefix}Wait`,
      duration: step.duration ?? 1,
      unit: step.unit ?? "days",
    });
  }
  if (step.kind === "condition") {
    const condition = conditionForTitle(step.title);
    return node(key, NodeType.IF_ELSE, position.x, position.y, {
      version: 2,
      actionName: step.title,
      variableName: `${variablePrefix}Result`,
      clientId,
      matchMode: "all",
      conditions: [
        {
          id: `${key}-condition`,
          leftOperand: condition.operand,
          leftLabel: condition.label,
          operator: condition.operator,
          rightOperand: String(condition.value),
          rightLabel: String(condition.value),
          rightOperandSource: "value",
          valueType: "number",
        },
      ],
    });
  }
  if (step.kind === "email") {
    return node(key, NodeType.SEND_EMAIL, position.x, position.y, {
      actionName: step.title,
      variableName: `${variablePrefix}Email`,
      clientId,
      purpose: "MARKETING",
      subject: neutralSubject(step.title),
      html: `<p>${neutralMessage(step.title)}</p>`,
      text: neutralMessage(step.title),
    });
  }
  if (step.kind === "sms") {
    return node(key, NodeType.SEND_SMS, position.x, position.y, {
      actionName: step.title,
      clientId,
      message: neutralMessage(step.title),
      purpose: "MARKETING",
    });
  }

  const nodeType =
    step.kind === "addTag"
      ? NodeType.ADD_TAG_TO_CLIENT
      : NodeType.REMOVE_TAG_FROM_CLIENT;
  const tags = step.tags?.length ? step.tags : [defaultTag(step.title)];
  return node(key, nodeType, position.x, position.y, {
    actionName: step.title,
    variableName: `${variablePrefix}Client`,
    clientId,
    tag: tags[0] ?? "",
    tags,
  });
}

function conditionForTitle(title: string): {
  operand: string;
  label: string;
  operator: "equals" | "greaterThanOrEqual";
  value: number;
} {
  if (/not bought|purchase/i.test(title)) {
    return {
      operand: "{{system.purchases.successful}}",
      label: "Successful pricing option purchases",
      operator: "equals",
      value: 0,
    };
  }
  if (/book/i.test(title)) {
    return {
      operand: "{{system.reservations.booked}}",
      label: "Booked reservations",
      operator: "greaterThanOrEqual",
      value: 1,
    };
  }
  if (/half/i.test(title)) {
    return {
      operand: "{{system.reservations.attended}}",
      label: "Attended reservations",
      operator: "greaterThanOrEqual",
      value: 2,
    };
  }
  return {
    operand: "{{system.reservations.attended}}",
    label: "Attended reservations",
    operator: "greaterThanOrEqual",
    value: 3,
  };
}

function neutralSubject(title: string): string {
  if (/completed/i.test(title)) return "You completed your intro journey";
  if (/discount|next step|experience/i.test(title)) {
    return "Your next studio option";
  }
  if (/first class|1st class/i.test(title)) return "Your first class";
  if (/book|hurry|last call/i.test(title)) return "A reminder to book";
  if (/founder/i.test(title)) return "Meet the studio";
  return title;
}

function neutralMessage(title: string): string {
  if (/completed/i.test(title)) {
    return "Congratulations on completing this stage. Reply if you would like help choosing what comes next.";
  }
  if (/book|hurry|last call|reminder/i.test(title)) {
    return "A quick reminder to book your next visit. Reply if you would like help finding a suitable time.";
  }
  if (/discount|next step|experience/i.test(title)) {
    return "Your next studio options are ready. Review the available choices or reply for a recommendation.";
  }
  return "Here is the next step in your studio journey. Reply if you need any help.";
}

function defaultTag(title: string): string {
  if (/lost|former|ex client/i.test(title)) return "former-client";
  if (/complete/i.test(title)) return "intro-complete";
  if (/uninterested/i.test(title)) return "lead-uninterested";
  return "intro-active";
}

function stepKey(index: number): string {
  return `step-${index}`;
}

export function replicaConnections(
  edges: readonly ReplicaEdge[],
): TemplateConnection[] {
  return edges.map(([source, target, branch = "main"]) =>
    connection(stepKey(source), stepKey(target), branch),
  );
}
