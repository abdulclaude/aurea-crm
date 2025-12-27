import type { NodeExecutor } from "@/features/executions/types";
import { googleDriveFolderCreatedChannel } from "@/inngest/channels/google-drive-folder-created";

export interface GoogleDriveFolderCreatedConfig {
  variableName?: string;
}

export const googleDriveFolderCreatedExecutor: NodeExecutor<GoogleDriveFolderCreatedConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(googleDriveFolderCreatedChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(googleDriveFolderCreatedChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(googleDriveFolderCreatedChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "newFolder";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
