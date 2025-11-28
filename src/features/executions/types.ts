import type { Realtime } from "@inngest/realtime";
import type { GetStepTools, Inngest } from "inngest";

export type WorkflowContext = Record<string, unknown>;

export type StepTools = GetStepTools<Inngest.Any>;

export interface WorkflowMetadata {
  workflowId: string;
  workflowName: string;
  isBundle?: boolean;
}

export interface NodeExecutorParams<TData = Record<string, unknown>> {
  data: TData;
  nodeId: string;
  userId: string;
  context: WorkflowContext;
  step: StepTools;
  publish: Realtime.PublishFn;
  // Optional parent workflow metadata (for bundle workflows)
  parentWorkflow?: WorkflowMetadata;
  // Optional map of node-level context for tracking (node ID -> node's context contribution)
  nodeLevelContext?: Map<string, Record<string, unknown>>;
}

export type NodeExecutor<TData = Record<string, unknown>> = (
  params: NodeExecutorParams<TData>
) => Promise<WorkflowContext>;
