import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { db } from "@/db";
import { NodeType } from "@/db/enums";
import { form, workflows } from "@/db/schema";
import { getWorkflowActivationIssues } from "@/features/workflows/lib/workflow-activation-policy";
import { formSubmittedTriggerConfigSchema } from "@/features/workflows/lib/studio-trigger-config";
import { getWorkflowFormReadinessIssues } from "@/features/workflows/lib/workflow-form-readiness";

import { getWorkflowProviderReadinessIssues } from "./workflow-provider-readiness";
import {
  requireWorkflowScope,
  workflowScopeWhere,
  type WorkflowScopeContext,
} from "./workflow-scope";

export async function getScopedWorkflowReadinessIssues(
  ctx: WorkflowScopeContext,
  workflowId: string,
): Promise<string[]> {
  const scope = requireWorkflowScope(ctx);
  const candidate = await db.query.workflows.findFirst({
    where: and(eq(workflows.id, workflowId), workflowScopeWhere(ctx)),
    columns: { isBundle: true },
    with: {
      nodes: {
        columns: {
          id: true,
          type: true,
          data: true,
          credentialId: true,
          providerAccountId: true,
        },
      },
      connections: {
        columns: { fromNodeId: true, toNodeId: true },
      },
    },
  });
  if (!candidate) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });
  }

  const studioScopeIssues =
    !scope.locationId &&
    candidate.nodes.some((node) => node.type === NodeType.STUDIO_CLASS_ACTION)
      ? ["Class and waitlist actions require a location-scoped workflow."]
      : [];
  const formIds = [
    ...new Set(
      candidate.nodes.flatMap((node) => {
        if (node.type !== NodeType.FORM_SUBMITTED_TRIGGER) return [];
        const config = formSubmittedTriggerConfigSchema.safeParse(node.data);
        return config.success && config.data.formId ? [config.data.formId] : [];
      }),
    ),
  ];
  const scopedForms = formIds.length
    ? await db.query.form.findMany({
        where: and(
          eq(form.organizationId, scope.organizationId),
          scope.locationId
            ? eq(form.locationId, scope.locationId)
            : isNull(form.locationId),
          inArray(form.id, formIds),
        ),
        columns: {
          id: true,
          name: true,
          status: true,
          crmResolutionConfig: true,
          automationConfig: true,
        },
        with: {
          formSteps: {
            columns: { id: true },
            with: {
              formFields: {
                columns: {
                  id: true,
                  label: true,
                  type: true,
                  required: true,
                },
              },
            },
          },
        },
      })
    : [];
  const formIssues = getWorkflowFormReadinessIssues({
    nodes: candidate.nodes,
    connections: candidate.connections,
    forms: scopedForms.map((selectedForm) => ({
      id: selectedForm.id,
      name: selectedForm.name,
      status: selectedForm.status,
      crmResolutionConfig: selectedForm.crmResolutionConfig,
      automationConfig: selectedForm.automationConfig,
      fields: selectedForm.formSteps.flatMap((step) => step.formFields),
    })),
  });

  return [
    ...getWorkflowActivationIssues(candidate),
    ...studioScopeIssues,
    ...formIssues,
    ...(await getWorkflowProviderReadinessIssues({
      nodes: candidate.nodes,
      organizationId: scope.organizationId,
      locationId: scope.locationId,
    })),
  ];
}
