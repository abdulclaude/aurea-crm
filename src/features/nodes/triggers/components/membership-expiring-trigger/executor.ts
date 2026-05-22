import type { NodeExecutor } from "@/features/executions/types";
import { membershipExpiringTriggerChannel } from "@/inngest/channels/membership-expiring-trigger";

export interface MembershipExpiringTriggerConfig {
  variableName?: string;
}

export const membershipExpiringTriggerExecutor: NodeExecutor<
  MembershipExpiringTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    membershipExpiringTriggerChannel().status({ nodeId, status: "loading" })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    await publish(
      membershipExpiringTriggerChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      membershipExpiringTriggerChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "expiringMembership";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
