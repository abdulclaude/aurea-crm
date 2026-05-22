import type { NodeExecutor } from "@/features/executions/types";
import { classBookedTriggerChannel } from "@/inngest/channels/class-booked-trigger";

export interface ClassBookedTriggerConfig {
  variableName?: string;
}

export const classBookedTriggerExecutor: NodeExecutor<
  ClassBookedTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    classBookedTriggerChannel().status({ nodeId, status: "loading" })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    await publish(
      classBookedTriggerChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      classBookedTriggerChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "bookedClass";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
