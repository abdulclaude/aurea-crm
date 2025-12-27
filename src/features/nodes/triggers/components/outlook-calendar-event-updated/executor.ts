import type { NodeExecutor } from "@/features/executions/types";
import { outlookCalendarEventUpdatedChannel } from "@/inngest/channels/outlook-calendar-event-updated";

export interface OutlookCalendarEventUpdatedConfig {
  variableName?: string;
}

export const outlookCalendarEventUpdatedExecutor: NodeExecutor<OutlookCalendarEventUpdatedConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(outlookCalendarEventUpdatedChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(outlookCalendarEventUpdatedChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(outlookCalendarEventUpdatedChannel().status({ nodeId, status: "error" }));
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
