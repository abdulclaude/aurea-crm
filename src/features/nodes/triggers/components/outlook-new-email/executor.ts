import type { NodeExecutor } from "@/features/executions/types";
import { outlookNewEmailChannel } from "@/inngest/channels/outlook-new-email";

export interface OutlookNewEmailConfig {
  variableName?: string;
}

export const outlookNewEmailExecutor: NodeExecutor<OutlookNewEmailConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(outlookNewEmailChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(outlookNewEmailChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(outlookNewEmailChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "newEmail";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
