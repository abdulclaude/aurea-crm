import type { NodeExecutor } from "@/features/executions/types";
import { oneDriveTriggerChannel } from "@/inngest/channels/onedrive-trigger";
import { auth } from "@/lib/auth";
import { NonRetriableError } from "inngest";
import type { OneDriveTriggerConfig } from "@/features/onedrive/server/subscriptions";

export const oneDriveTriggerExecutor: NodeExecutor<OneDriveTriggerConfig> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(oneDriveTriggerChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    const tokenResponse = await auth.api.getAccessToken({
      body: {
        providerId: "microsoft",
        userId,
      },
    });

    const accessToken = tokenResponse?.accessToken;
    if (!accessToken) {
      throw new NonRetriableError(
        "OneDrive is not connected. Please connect Microsoft 365."
      );
    }

    const folderPath = data?.folderPath;
    const resource = folderPath
      ? `me/drive/root:${folderPath}:/children`
      : "me/drive/root/children";

    const files = await step.run("onedrive-fetch-changes", async () => {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/${resource}?$orderby=lastModifiedDateTime desc&$top=10`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new NonRetriableError("Failed to fetch OneDrive changes.");
      }

      const data = await response.json();
      return data.value;
    });

    // Filter by file pattern if provided
    let filteredFiles = files;
    if (data?.filePattern) {
      filteredFiles = filteredFiles.filter((file: { name: string }) =>
        file.name?.includes(data.filePattern!)
      );
    }

    const payload = {
      files: filteredFiles,
      count: filteredFiles.length,
    };

    await publish(oneDriveTriggerChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: payload,
    };
  } catch (error) {
    await publish(oneDriveTriggerChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "oneDriveTrigger";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
