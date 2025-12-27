import type { NodeExecutor } from "@/features/executions/types";
import { googleDriveFileDeletedChannel } from "@/inngest/channels/google-drive-file-deleted";

export interface GoogleDriveFileDeletedConfig {
  variableName?: string;
}

export const googleDriveFileDeletedExecutor: NodeExecutor<GoogleDriveFileDeletedConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(googleDriveFileDeletedChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(googleDriveFileDeletedChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(googleDriveFileDeletedChannel().status({ nodeId, status: "error" }));
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
