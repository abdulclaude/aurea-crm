import type { NodeExecutor } from "@/features/executions/types";
import { outlookEmailMovedChannel } from "@/inngest/channels/outlook-email-moved";

export interface OutlookEmailMovedConfig {
  variableName?: string;
}

export const outlookEmailMovedExecutor: NodeExecutor<OutlookEmailMovedConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(outlookEmailMovedChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(outlookEmailMovedChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(outlookEmailMovedChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "movedEmail";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
