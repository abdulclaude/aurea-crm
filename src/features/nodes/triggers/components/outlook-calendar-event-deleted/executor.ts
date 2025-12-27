import type { NodeExecutor } from "@/features/executions/types";
import { outlookCalendarEventDeletedChannel } from "@/inngest/channels/outlook-calendar-event-deleted";

export interface OutlookCalendarEventDeletedConfig {
  variableName?: string;
}

export const outlookCalendarEventDeletedExecutor: NodeExecutor<OutlookCalendarEventDeletedConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(outlookCalendarEventDeletedChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(outlookCalendarEventDeletedChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(outlookCalendarEventDeletedChannel().status({ nodeId, status: "error" }));
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
