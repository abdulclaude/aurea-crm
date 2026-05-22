import type { NodeExecutor } from "@/features/executions/types";
import { membershipCreatedTriggerChannel } from "@/inngest/channels/membership-created-trigger";

export interface MembershipCreatedTriggerConfig {
  variableName?: string;
}

export const membershipCreatedTriggerExecutor: NodeExecutor<
  MembershipCreatedTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    membershipCreatedTriggerChannel().status({ nodeId, status: "loading" })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    await publish(
      membershipCreatedTriggerChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      membershipCreatedTriggerChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "newMembership";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
