import { NonRetriableError } from "inngest";

import { NodeType } from "@/db/enums";
import type { NodeExecutor } from "@/features/executions/types";
import type { OneDriveTriggerConfig } from "@/features/onedrive/server/subscriptions";
import { resolveOAuthProviderGrant } from "@/features/provider-accounts/server/oauth-resolver";
import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import { getWorkflowProviderBindingSpec } from "@/features/workflows/lib/workflow-provider-binding";
import { oneDriveTriggerChannel } from "@/inngest/channels/onedrive-trigger";

type ScopedOneDriveTriggerConfig = OneDriveTriggerConfig & {
  providerAccountId?: string;
};

const providerBinding = getWorkflowProviderBindingSpec(
  NodeType.ONEDRIVE_TRIGGER,
);

export const oneDriveTriggerExecutor: NodeExecutor<
  ScopedOneDriveTriggerConfig
> = async ({ data, nodeId, scope, context, step, publish }) => {
  await publish(oneDriveTriggerChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    if (!data.providerAccountId) {
      throw new NonRetriableError(
        "Select a OneDrive account for this trigger.",
      );
    }

    const grant = await resolveOAuthProviderGrant({
      providerAccountId: data.providerAccountId,
      provider: providerBinding.provider,
      scope: {
        organizationId: scope.organizationId,
        locationId: scope.locationId,
      },
      requiredScopes: providerBinding.requiredScopes,
    });
    const { accessToken } = grant;

    const folderPath = data?.folderPath;
    const resource = folderPath
      ? `me/drive/root:${folderPath}:/children`
      : "me/drive/root/children";

    const files = await step.run("onedrive-fetch-changes", async () => {
      const response = await oauthAuthenticatedFetch(
        grant,
        `https://graph.microsoft.com/v1.0/${resource}?$orderby=lastModifiedDateTime desc&$top=10`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new NonRetriableError("Failed to fetch OneDrive changes.");
      }

      const data = await response.json();
      return data.value;
    });

    // Filter by file pattern if provided
    let filteredFiles = files;
    const filePattern = data?.filePattern;
    if (filePattern) {
      filteredFiles = filteredFiles.filter((file: { name: string }) =>
        file.name?.includes(filePattern),
      );
    }

    const payload = {
      files: filteredFiles,
      count: filteredFiles.length,
    };

    await publish(
      oneDriveTriggerChannel().status({ nodeId, status: "success" }),
    );

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
