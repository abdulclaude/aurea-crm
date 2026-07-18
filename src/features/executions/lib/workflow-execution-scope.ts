import type { WorkflowExecutionScope } from "@/features/executions/types";

export const MAX_BUNDLE_WORKFLOW_DEPTH = 8;

type WorkflowScopeSnapshot = {
  organizationId: string | null;
  locationId: string | null;
};

type BundleWorkflowCandidate = WorkflowScopeSnapshot & {
  id: string;
  archived: boolean;
  isBundle: boolean;
  isTemplate: boolean;
};

export function workflowMatchesExecutionSnapshot(
  workflow: WorkflowScopeSnapshot,
  scope: Pick<WorkflowExecutionScope, "organizationId" | "locationId">,
): boolean {
  return (
    workflow.organizationId === scope.organizationId &&
    workflow.locationId === scope.locationId
  );
}

export function bundleWorkflowMatchesExecutionScope(
  workflow: BundleWorkflowCandidate,
  scope: WorkflowExecutionScope,
): boolean {
  return (
    workflow.isBundle &&
    !workflow.archived &&
    !workflow.isTemplate &&
    workflowMatchesExecutionSnapshot(workflow, scope)
  );
}

export function deriveBundleWorkflowScope(
  scope: WorkflowExecutionScope,
  workflowId: string,
): WorkflowExecutionScope {
  if (scope.workflowPath.includes(workflowId)) {
    throw new Error("Bundle workflow cycles are not allowed.");
  }
  if (scope.workflowPath.length >= MAX_BUNDLE_WORKFLOW_DEPTH) {
    throw new Error(
      `Bundle workflow depth cannot exceed ${MAX_BUNDLE_WORKFLOW_DEPTH}.`,
    );
  }
  return {
    ...scope,
    workflowId,
    workflowPath: [...scope.workflowPath, workflowId],
  };
}
