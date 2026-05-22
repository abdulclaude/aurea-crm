import type { NodeExecutor } from "@/features/executions/types";
import { clientCreatedTriggerChannel } from "@/inngest/channels/client-created-trigger";

export interface ClientCreatedTriggerConfig {
  variableName?: string;
}

export const clientCreatedTriggerExecutor: NodeExecutor<
  ClientCreatedTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    clientCreatedTriggerChannel().status({ nodeId, status: "loading" })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The client data will be passed in through the context from the trigger
    // No need to fetch anything here - this is a passive trigger

    await publish(
      clientCreatedTriggerChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      clientCreatedTriggerChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "newClient";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
