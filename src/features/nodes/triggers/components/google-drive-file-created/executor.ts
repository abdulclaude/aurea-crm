import type { NodeExecutor } from "@/features/executions/types";
import { googleDriveFileCreatedChannel } from "@/inngest/channels/google-drive-file-created";

export interface GoogleDriveFileCreatedConfig {
  variableName?: string;
}

export const googleDriveFileCreatedExecutor: NodeExecutor<GoogleDriveFileCreatedConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(googleDriveFileCreatedChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(googleDriveFileCreatedChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(googleDriveFileCreatedChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "newFile";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
