import type { NodeExecutor } from "@/features/executions/types";
import { appointmentCreatedTriggerChannel } from "@/inngest/channels/appointment-created-trigger";

export interface AppointmentCreatedTriggerConfig {
  variableName?: string;
}

export const appointmentCreatedTriggerExecutor: NodeExecutor<AppointmentCreatedTriggerConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(appointmentCreatedTriggerChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(appointmentCreatedTriggerChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(appointmentCreatedTriggerChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "newAppointment";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
