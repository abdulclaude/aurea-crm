import type { NodeExecutor } from "@/features/executions/types";
import { dealDeletedTriggerChannel } from "@/inngest/channels/deal-deleted-trigger";

export interface DealDeletedTriggerConfig {
  variableName?: string;
}

export const dealDeletedTriggerExecutor: NodeExecutor<
  DealDeletedTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    dealDeletedTriggerChannel().status({ nodeId, status: "loading" })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    await publish(
      dealDeletedTriggerChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      dealDeletedTriggerChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "deletedDeal";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
