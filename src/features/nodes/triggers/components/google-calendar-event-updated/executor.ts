import type { NodeExecutor } from "@/features/executions/types";
import { googleCalendarEventUpdatedChannel } from "@/inngest/channels/google-calendar-event-updated";

export interface GoogleCalendarEventUpdatedConfig {
  variableName?: string;
}

export const googleCalendarEventUpdatedExecutor: NodeExecutor<GoogleCalendarEventUpdatedConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(googleCalendarEventUpdatedChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(googleCalendarEventUpdatedChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(googleCalendarEventUpdatedChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "updatedEvent";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
