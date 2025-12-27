import type { NodeExecutor } from "@/features/executions/types";
import { appointmentCancelledTriggerChannel } from "@/inngest/channels/appointment-cancelled-trigger";

export interface AppointmentCancelledTriggerConfig {
  variableName?: string;
}

export const appointmentCancelledTriggerExecutor: NodeExecutor<AppointmentCancelledTriggerConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(appointmentCancelledTriggerChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(appointmentCancelledTriggerChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(appointmentCancelledTriggerChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "cancelledAppointment";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
