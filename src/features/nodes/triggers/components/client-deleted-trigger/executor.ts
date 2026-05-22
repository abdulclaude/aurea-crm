import type { NodeExecutor } from "@/features/executions/types";
import { clientDeletedTriggerChannel } from "@/inngest/channels/client-deleted-trigger";

export interface ClientDeletedTriggerConfig {
  variableName?: string;
}

export const clientDeletedTriggerExecutor: NodeExecutor<
  ClientDeletedTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    clientDeletedTriggerChannel().status({ nodeId, status: "loading" })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The deleted client data will be passed in through the context from the trigger
    // This is useful for cleanup workflows or archival purposes

    await publish(
      clientDeletedTriggerChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      clientDeletedTriggerChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "deletedClient";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
