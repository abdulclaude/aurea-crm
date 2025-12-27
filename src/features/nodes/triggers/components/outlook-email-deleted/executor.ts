import type { NodeExecutor } from "@/features/executions/types";
import { outlookEmailDeletedChannel } from "@/inngest/channels/outlook-email-deleted";

export interface OutlookEmailDeletedConfig {
  variableName?: string;
}

export const outlookEmailDeletedExecutor: NodeExecutor<OutlookEmailDeletedConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(outlookEmailDeletedChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(outlookEmailDeletedChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(outlookEmailDeletedChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "deletedEmail";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
