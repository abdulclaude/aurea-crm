import type { NodeExecutor } from "@/features/executions/types";
import { clientFieldChangedTriggerChannel } from "@/inngest/channels/client-field-changed-trigger";

export interface ClientFieldChangedTriggerConfig {
  variableName?: string;
  fieldName?: string; // Specific field to watch
}

export const clientFieldChangedTriggerExecutor: NodeExecutor<
  ClientFieldChangedTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    clientFieldChangedTriggerChannel().status({ nodeId, status: "loading" })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The field change data will be passed in through the context from the trigger
    // The context.triggerData should include field name, old value, and new value

    await publish(
      clientFieldChangedTriggerChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      clientFieldChangedTriggerChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "clientChange";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
