import type { NodeExecutor } from "@/features/executions/types";
import { googleCalendarEventCreatedChannel } from "@/inngest/channels/google-calendar-event-created";

export interface GoogleCalendarEventCreatedConfig {
  variableName?: string;
}

export const googleCalendarEventCreatedExecutor: NodeExecutor<GoogleCalendarEventCreatedConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(googleCalendarEventCreatedChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(googleCalendarEventCreatedChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(googleCalendarEventCreatedChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "newEvent";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
