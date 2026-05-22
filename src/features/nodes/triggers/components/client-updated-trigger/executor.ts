import type { NodeExecutor } from "@/features/executions/types";
import { clientUpdatedTriggerChannel } from "@/inngest/channels/client-updated-trigger";

export interface ClientUpdatedTriggerConfig {
  variableName?: string;
  watchFields?: string[]; // Optional: specific fields to watch
}

export const clientUpdatedTriggerExecutor: NodeExecutor<
  ClientUpdatedTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    clientUpdatedTriggerChannel().status({ nodeId, status: "loading" })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The updated client data will be passed in through the context from the trigger
    // The context.triggerData should include both old and new client data

    await publish(
      clientUpdatedTriggerChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      clientUpdatedTriggerChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "updatedClient";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
