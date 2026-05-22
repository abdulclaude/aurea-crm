import { NodeType } from "@/db/enums";
import type { JsonObject } from "@/db/json";

export type TemplateNode = {
  key: string;
  type: NodeType;
  position: { x: number; y: number };
  data: JsonObject;
};

export type TemplateConnection = {
  from: string;
  to: string;
  fromOutput?: string;
  toInput?: string;
};

export type StarterWorkflowTemplate = {
  slug: string;
  name: string;
  description: string;
  nodes: TemplateNode[];
  connections: TemplateConnection[];
};

export function node(
  key: string,
  type: NodeType,
  x: number,
  y: number,
  data: JsonObject,
): TemplateNode {
  return {
    key,
    type,
    position: { x, y },
    data,
  };
}

export function connection(
  from: string,
  to: string,
  fromOutput = "main",
  toInput = "main",
): TemplateConnection {
  return { from, to, fromOutput, toInput };
}
