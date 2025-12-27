import type { NodeExecutor } from "@/features/executions/types";
import { outlookCalendarEventCreatedChannel } from "@/inngest/channels/outlook-calendar-event-created";

export interface OutlookCalendarEventCreatedConfig {
  variableName?: string;
}

export const outlookCalendarEventCreatedExecutor: NodeExecutor<OutlookCalendarEventCreatedConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(outlookCalendarEventCreatedChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(outlookCalendarEventCreatedChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(outlookCalendarEventCreatedChannel().status({ nodeId, status: "error" }));
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
