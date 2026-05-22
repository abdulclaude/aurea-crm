import type { NodeExecutor } from "@/features/executions/types";
import { classCancelledTriggerChannel } from "@/inngest/channels/class-cancelled-trigger";

export interface ClassCancelledTriggerConfig {
  variableName?: string;
}

export const classCancelledTriggerExecutor: NodeExecutor<
  ClassCancelledTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    classCancelledTriggerChannel().status({ nodeId, status: "loading" })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    await publish(
      classCancelledTriggerChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      classCancelledTriggerChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "cancelledClass";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
