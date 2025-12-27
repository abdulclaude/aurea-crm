import type { NodeExecutor } from "@/features/executions/types";
import { onedriveFileUpdatedChannel } from "@/inngest/channels/onedrive-file-updated";

export interface OnedriveFileUpdatedConfig {
  variableName?: string;
}

export const onedriveFileUpdatedExecutor: NodeExecutor<OnedriveFileUpdatedConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(onedriveFileUpdatedChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(onedriveFileUpdatedChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(onedriveFileUpdatedChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "updatedFile";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
