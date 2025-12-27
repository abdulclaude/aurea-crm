import type { NodeExecutor } from "@/features/executions/types";
import { onedriveFileDeletedChannel } from "@/inngest/channels/onedrive-file-deleted";

export interface OnedriveFileDeletedConfig {
  variableName?: string;
}

export const onedriveFileDeletedExecutor: NodeExecutor<OnedriveFileDeletedConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(onedriveFileDeletedChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(onedriveFileDeletedChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(onedriveFileDeletedChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "deletedFile";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
