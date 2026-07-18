import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { TRPCError } from "@trpc/server";
import { PgDialect } from "drizzle-orm/pg-core";

import {
  requireWorkflowScope,
  workflowScopeWhere,
  type WorkflowScopeContext,
} from "../workflow-scope";

const dialect = new PgDialect();

function ctx({
  userId = "user-a",
  organizationId = "org-a",
  locationId = "location-a",
}: {
  userId?: string;
  organizationId?: string | null;
  locationId?: string | null;
} = {}): WorkflowScopeContext {
  return {
    auth: { user: { id: userId } },
    orgId: organizationId,
    locationId,
  };
}

describe("workflow tenant scope", () => {
  it("requires an active organization", () => {
    assert.throws(
      () => requireWorkflowScope(ctx({ organizationId: null })),
      (error: unknown) =>
        error instanceof TRPCError && error.code === "BAD_REQUEST",
    );
  });

  it("includes user, organization, and exact location in scoped queries", () => {
    const query = dialect.sqlToQuery(workflowScopeWhere(ctx()));

    assert.match(query.sql, /"Workflows"\."userId" = \$1/);
    assert.match(query.sql, /"Workflows"\."organizationId" = \$2/);
    assert.match(query.sql, /"Workflows"\."locationId" = \$3/);
    assert.deepEqual(query.params, ["user-a", "org-a", "location-a"]);
  });

  it("treats organization-level scope as exact null rather than a wildcard", () => {
    const query = dialect.sqlToQuery(
      workflowScopeWhere(ctx({ locationId: null })),
    );

    assert.match(query.sql, /"Workflows"\."organizationId" = \$2/);
    assert.match(query.sql, /"Workflows"\."locationId" is null/);
    assert.deepEqual(query.params, ["user-a", "org-a"]);
  });

  it("keeps the active organization in the query when user and location collide", () => {
    const orgAQuery = dialect.sqlToQuery(workflowScopeWhere(ctx()));
    const orgBQuery = dialect.sqlToQuery(
      workflowScopeWhere(ctx({ organizationId: "org-b" })),
    );

    assert.deepEqual(orgAQuery.params, ["user-a", "org-a", "location-a"]);
    assert.deepEqual(orgBQuery.params, ["user-a", "org-b", "location-a"]);
  });
});
