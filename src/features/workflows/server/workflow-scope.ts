import { workflows } from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull, type SQL } from "drizzle-orm";

export type WorkflowScopeContext = {
  auth: { user: { id: string } };
  orgId: string | null;
  locationId?: string | null;
};

export type WorkflowScope = {
  userId: string;
  organizationId: string;
  locationId: string | null;
};

export function requireWorkflowScope(
  ctx: WorkflowScopeContext,
): WorkflowScope {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Organization context required for workflows.",
    });
  }

  return {
    userId: ctx.auth.user.id,
    organizationId: ctx.orgId,
    locationId: ctx.locationId ?? null,
  };
}

export function workflowScopeWhere(
  ctx: WorkflowScopeContext,
): SQL<unknown> {
  const scope = requireWorkflowScope(ctx);
  const where = and(
    eq(workflows.userId, scope.userId),
    eq(workflows.organizationId, scope.organizationId),
    scope.locationId !== null
      ? eq(workflows.locationId, scope.locationId)
      : isNull(workflows.locationId),
  );

  if (!where) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to build workflow scope.",
    });
  }

  return where;
}
