import type { NodeExecutor } from "@/features/executions/types";
import { membershipCancelledTriggerChannel } from "@/inngest/channels/membership-cancelled-trigger";

export interface MembershipCancelledTriggerConfig {
  variableName?: string;
}

export const membershipCancelledTriggerExecutor: NodeExecutor<
  MembershipCancelledTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    membershipCancelledTriggerChannel().status({ nodeId, status: "loading" })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    await publish(
      membershipCancelledTriggerChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      membershipCancelledTriggerChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "cancelledMembership";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
