import type { NodeExecutor } from "@/features/executions/types";
import { dealUpdatedTriggerChannel } from "@/inngest/channels/deal-updated-trigger";

export interface DealUpdatedTriggerConfig {
  variableName?: string;
}

export const dealUpdatedTriggerExecutor: NodeExecutor<
  DealUpdatedTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    dealUpdatedTriggerChannel().status({ nodeId, status: "loading" })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    await publish(
      dealUpdatedTriggerChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      dealUpdatedTriggerChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "updatedDeal";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
