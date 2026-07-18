import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const routerSource = source("src/features/workflows/server/routers.ts");
const runtimeSource = source("src/inngest/functions.ts");
const readinessSource = source(
  "src/features/workflows/server/workflow-provider-readiness.ts",
);
const subscriptionSyncSource = source(
  "src/features/workflows/server/provider-subscription-sync.ts",
);

describe("workflow provider binding enforcement", () => {
  it("persists an authoritative provider-account column and validates active edits", () => {
    assert.match(routerSource, /assertWorkflowProviderBindingsCanBeSaved/);
    assert.match(routerSource, /providerAccountId: getDraftNodeProviderAccountId/);
    assert.match(routerSource, /if \(!workflow\.archived && !workflow\.isTemplate\)/);
    assert.match(routerSource, /getWorkflowProviderReadinessIssues/);
  });

  it("blocks unready manual and background executions", () => {
    assert.match(routerSource, /getScopedWorkflowReadinessIssues\(ctx, input\.id\)/);
    assert.match(runtimeSource, /\.\.\.getWorkflowActivationIssues\(workflowMeta\)/);
    assert.match(runtimeSource, /await getWorkflowProviderReadinessIssues\(\{/);
    assert.match(runtimeSource, /throw new NonRetriableError\(readinessIssues\.join\(" "\)\)/);
  });

  it("uses the persisted binding as runtime authority", () => {
    assert.match(runtimeSource, /data\.providerAccountId = workflowNode\.providerAccountId/);
    assert.match(runtimeSource, /delete data\.providerAccountId/);
    assert.match(readinessSource, /node\.providerAccountId !== dataProviderAccountId/);
  });

  it("creates workflows and template clones inactive until reviewed", () => {
    assert.match(routerSource, /archived: true/);
    assert.doesNotMatch(
      routerSource,
      /createWorkflowFromTemplate[\s\S]*?archived: false/,
    );
  });

  it("keeps workflows inactive when provider subscription setup fails", () => {
    assert.match(subscriptionSyncSource, /strict = false/);
    assert.match(subscriptionSyncSource, /if \(strict\)/);
    assert.match(routerSource, /syncActiveWorkflowOrDeactivate/);
    assert.match(routerSource, /set\(\{ archived: true, updatedAt: new Date\(\) \}\)/);
    assert.match(
      routerSource,
      /Provider subscriptions could not be created\. The workflow was kept inactive\./,
    );
  });
});
