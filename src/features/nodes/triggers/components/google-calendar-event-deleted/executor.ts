import type { NodeExecutor } from "@/features/executions/types";
import { googleCalendarEventDeletedChannel } from "@/inngest/channels/google-calendar-event-deleted";

export interface GoogleCalendarEventDeletedConfig {
  variableName?: string;
}

export const googleCalendarEventDeletedExecutor: NodeExecutor<GoogleCalendarEventDeletedConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(googleCalendarEventDeletedChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(googleCalendarEventDeletedChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(googleCalendarEventDeletedChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "deletedEvent";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
