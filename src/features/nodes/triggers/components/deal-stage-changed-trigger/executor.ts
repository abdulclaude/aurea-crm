import type { NodeExecutor } from "@/features/executions/types";
import { dealStageChangedTriggerChannel } from "@/inngest/channels/deal-stage-changed-trigger";

export interface DealStageChangedTriggerConfig {
  variableName?: string;
}

export const dealStageChangedTriggerExecutor: NodeExecutor<
  DealStageChangedTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    dealStageChangedTriggerChannel().status({ nodeId, status: "loading" })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    await publish(
      dealStageChangedTriggerChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      dealStageChangedTriggerChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "dealStageChange";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
