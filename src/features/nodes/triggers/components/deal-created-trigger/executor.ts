import type { NodeExecutor } from "@/features/executions/types";
import { dealCreatedTriggerChannel } from "@/inngest/channels/deal-created-trigger";

export interface DealCreatedTriggerConfig {
  variableName?: string;
}

export const dealCreatedTriggerExecutor: NodeExecutor<
  DealCreatedTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    dealCreatedTriggerChannel().status({ nodeId, status: "loading" })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The deal data will be passed in through the context from the trigger
    // No need to fetch anything here - this is a passive trigger

    await publish(
      dealCreatedTriggerChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      dealCreatedTriggerChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "newDeal";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
