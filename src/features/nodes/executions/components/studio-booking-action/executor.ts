import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";

import type { NodeExecutor } from "@/features/executions/types";
import { requireCapability } from "@/features/permissions/server/authorization";
import { runStudioBookingWorkflowAction } from "@/features/studio/server/studio-booking-workflow-action-service";
import { studioBookingActionChannel } from "@/inngest/channels/studio-booking-action";

import {
  studioBookingActionFormSchema,
  type StudioBookingActionFormValues,
} from "./config";

export const studioBookingActionExecutor: NodeExecutor<
  StudioBookingActionFormValues
> = async ({ data, nodeId, userId, scope, context, step, publish }) => {
  await publish(
    studioBookingActionChannel().status({ nodeId, status: "loading" }),
  );
  try {
    const parsed = studioBookingActionFormSchema.safeParse(data);
    if (!parsed.success) {
      throw new NonRetriableError(
        `Class booking action: ${parsed.error.issues[0]?.message ?? "Invalid configuration."}`,
      );
    }
    const locationId = scope.locationId;
    if (!locationId) {
      throw new NonRetriableError(
        "Class booking actions require a location-scoped workflow.",
      );
    }

    const capability =
      parsed.data.operation === "CHECK_IN" ||
      parsed.data.operation === "MARK_NO_SHOW"
        ? "attendance.manage"
        : "schedule.manage";
    try {
      await requireCapability({
        actor: {
          userId,
          organizationId: scope.organizationId,
          locationId,
        },
        capability,
        resource: {
          organizationId: scope.organizationId,
          locationId,
        },
      });
    } catch {
      throw new NonRetriableError(
        "The workflow owner is no longer allowed to manage this studio action.",
      );
    }

    const classId = resolveWorkflowResourceId(parsed.data.classId, context);
    const clientId = resolveWorkflowResourceId(parsed.data.clientId, context);
    const result = await step.run(`studio-class-action:${nodeId}`, () =>
      runStudioBookingWorkflowAction({
        operation: parsed.data.operation,
        organizationId: scope.organizationId,
        locationId,
        actorUserId: userId,
        classId,
        clientId,
      }),
    );

    await publish(
      studioBookingActionChannel().status({ nodeId, status: "success" }),
    );
    return { ...context, [parsed.data.variableName]: result };
  } catch (error) {
    await publish(
      studioBookingActionChannel().status({ nodeId, status: "error" }),
    );
    throw error;
  }
};

export function resolveWorkflowResourceId(
  template: string,
  context: Record<string, unknown>,
): string {
  const resolved = Handlebars.compile(template, { noEscape: true })(
    context,
  ).trim();
  if (!resolved) {
    throw new NonRetriableError(
      "A class or member reference resolved to an empty value.",
    );
  }
  return resolved;
}
