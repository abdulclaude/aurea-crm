import type { NodeExecutor } from "@/features/executions/types";
import { googleDriveFileUpdatedChannel } from "@/inngest/channels/google-drive-file-updated";

export interface GoogleDriveFileUpdatedConfig {
  variableName?: string;
}

export const googleDriveFileUpdatedExecutor: NodeExecutor<GoogleDriveFileUpdatedConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(googleDriveFileUpdatedChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(googleDriveFileUpdatedChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(googleDriveFileUpdatedChannel().status({ nodeId, status: "error" }));
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
