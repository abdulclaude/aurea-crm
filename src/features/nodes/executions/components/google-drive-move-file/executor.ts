import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";

import { NodeType } from "@/db/enums";
import type { NodeExecutor } from "@/features/executions/types";
import { resolveOAuthProviderGrant } from "@/features/provider-accounts/server/oauth-resolver";
import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import { getWorkflowProviderBindingSpec } from "@/features/workflows/lib/workflow-provider-binding";
import { googleDriveMoveFileChannel } from "@/inngest/channels/google-drive-move-file";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GoogleDriveMoveFileData = {
  providerAccountId: string;
  variableName?: string;
  fileId: string;
  newParentId: string;
};

const providerBinding = getWorkflowProviderBindingSpec(
  NodeType.GOOGLE_DRIVE_MOVE_FILE,
);

export const googleDriveMoveFileExecutor: NodeExecutor<GoogleDriveMoveFileData> =
  async ({ data, nodeId, scope, context, step, publish }) => {
    await publish(
      googleDriveMoveFileChannel().status({ nodeId, status: "loading" })
    );

    try {
      if (!data.providerAccountId || !data.fileId || !data.newParentId) {
        await publish(
          googleDriveMoveFileChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Drive: Account, file ID, and new parent folder ID are required"
        );
      }

      const grant = await step.run("get-google-token", async () =>
        resolveOAuthProviderGrant({
          providerAccountId: data.providerAccountId,
          provider: providerBinding.provider,
          scope,
          requiredScopes: providerBinding.requiredScopes,
        })
      );
      const { accessToken } = grant;

      // Compile templates
      const fileId = decode(Handlebars.compile(data.fileId)(context));
      const newParentId = decode(Handlebars.compile(data.newParentId)(context));

      // Get current parents
      const fileMetadata = await step.run("get-file-metadata", async () => {
        const res = await oauthAuthenticatedFetch(
          grant,
          `https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Google Drive API rejected metadata with status ${res.status}.`);
        }

        return await res.json();
      });

      const previousParents = fileMetadata.parents
        ? fileMetadata.parents.join(",")
        : "";

      // Move file
      const response = await step.run("move-file", async () => {
        const res = await oauthAuthenticatedFetch(
          grant,
          `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${newParentId}&removeParents=${previousParents}&fields=id,name,mimeType,webViewLink,parents`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Google Drive API rejected the move with status ${res.status}.`);
        }

        return await res.json();
      });

      await publish(
        googleDriveMoveFileChannel().status({ nodeId, status: "success" })
      );

      return {
        ...context,
        ...(data.variableName
          ? {
              [data.variableName]: {
                id: response.id,
                name: response.name,
                mimeType: response.mimeType,
                webViewLink: response.webViewLink,
                parents: response.parents,
              },
            }
          : {}),
      };
    } catch (error) {
      await publish(
        googleDriveMoveFileChannel().status({ nodeId, status: "error" })
      );
      throw error;
    }
  };
