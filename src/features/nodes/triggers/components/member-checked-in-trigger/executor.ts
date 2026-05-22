import type { NodeExecutor } from "@/features/executions/types";
import { memberCheckedInTriggerChannel } from "@/inngest/channels/member-checked-in-trigger";

export interface MemberCheckedInTriggerConfig {
  variableName?: string;
}

export const memberCheckedInTriggerExecutor: NodeExecutor<
  MemberCheckedInTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    memberCheckedInTriggerChannel().status({ nodeId, status: "loading" })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    await publish(
      memberCheckedInTriggerChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      memberCheckedInTriggerChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "checkIn";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
