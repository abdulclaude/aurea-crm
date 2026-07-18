import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_BUNDLE_WORKFLOW_DEPTH,
  bundleWorkflowMatchesExecutionScope,
  deriveBundleWorkflowScope,
  workflowMatchesExecutionSnapshot,
} from "@/features/executions/lib/workflow-execution-scope";
import type { WorkflowExecutionScope } from "@/features/executions/types";

const rootScope: WorkflowExecutionScope = {
  executionId: "execution-a",
  rootWorkflowId: "workflow-root",
  workflowId: "workflow-root",
  organizationId: "org-a",
  locationId: "location-a",
  workflowPath: ["workflow-root"],
};

test("workflow snapshots must match both organization and exact location", () => {
  assert.equal(
    workflowMatchesExecutionSnapshot(
      { organizationId: "org-a", locationId: "location-a" },
      rootScope,
    ),
    true,
  );
  assert.equal(
    workflowMatchesExecutionSnapshot(
      { organizationId: "org-b", locationId: "location-a" },
      rootScope,
    ),
    false,
  );
  assert.equal(
    workflowMatchesExecutionSnapshot(
      { organizationId: "org-a", locationId: null },
      rootScope,
    ),
    false,
  );
});

test("bundle eligibility is fail closed", () => {
  const candidate = {
    id: "bundle-a",
    organizationId: "org-a",
    locationId: "location-a",
    archived: false,
    isBundle: true,
    isTemplate: false,
  };
  assert.equal(bundleWorkflowMatchesExecutionScope(candidate, rootScope), true);
  assert.equal(
    bundleWorkflowMatchesExecutionScope(
      { ...candidate, organizationId: "org-b" },
      rootScope,
    ),
    false,
  );
  assert.equal(
    bundleWorkflowMatchesExecutionScope(
      { ...candidate, archived: true },
      rootScope,
    ),
    false,
  );
  assert.equal(
    bundleWorkflowMatchesExecutionScope(
      { ...candidate, isTemplate: true },
      rootScope,
    ),
    false,
  );
});

test("nested bundle scope changes only the active workflow path", () => {
  const nested = deriveBundleWorkflowScope(rootScope, "bundle-a");
  assert.equal(nested.workflowId, "bundle-a");
  assert.equal(nested.rootWorkflowId, rootScope.rootWorkflowId);
  assert.equal(nested.executionId, rootScope.executionId);
  assert.equal(nested.organizationId, rootScope.organizationId);
  assert.equal(nested.locationId, rootScope.locationId);
  assert.deepEqual(nested.workflowPath, ["workflow-root", "bundle-a"]);
});

test("bundle cycles and excessive nesting are rejected", () => {
  assert.throws(
    () => deriveBundleWorkflowScope(rootScope, "workflow-root"),
    /cycles are not allowed/,
  );
  const deepScope = {
    ...rootScope,
    workflowPath: Array.from(
      { length: MAX_BUNDLE_WORKFLOW_DEPTH },
      (_, index) => `workflow-${index}`,
    ),
  };
  assert.throws(
    () => deriveBundleWorkflowScope(deepScope, "one-more"),
    /depth cannot exceed/,
  );
});
