import type { NodeExecutor } from "@/features/executions/types";
import { memberNoShowTriggerChannel } from "@/inngest/channels/member-no-show-trigger";

export interface MemberNoShowTriggerConfig {
  variableName?: string;
}

export const memberNoShowTriggerExecutor: NodeExecutor<
  MemberNoShowTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    memberNoShowTriggerChannel().status({ nodeId, status: "loading" })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    await publish(
      memberNoShowTriggerChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      memberNoShowTriggerChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "noShow";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
