import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";

import { NodeType } from "@/db/enums";
import type { NodeExecutor } from "@/features/executions/types";
import { resolveOAuthProviderGrant } from "@/features/provider-accounts/server/oauth-resolver";
import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import { getWorkflowProviderBindingSpec } from "@/features/workflows/lib/workflow-provider-binding";
import { googleDriveDownloadFileChannel } from "@/inngest/channels/google-drive-download-file";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GoogleDriveDownloadFileData = {
  providerAccountId: string;
  variableName?: string;
  fileId: string;
};

const providerBinding = getWorkflowProviderBindingSpec(
  NodeType.GOOGLE_DRIVE_DOWNLOAD_FILE,
);

export const googleDriveDownloadFileExecutor: NodeExecutor<GoogleDriveDownloadFileData> =
  async ({ data, nodeId, scope, context, step, publish }) => {
    await publish(
      googleDriveDownloadFileChannel().status({ nodeId, status: "loading" })
    );

    try {
      if (!data.providerAccountId || !data.fileId) {
        await publish(
          googleDriveDownloadFileChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Drive: Account and file ID are required",
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

      const fileId = decode(Handlebars.compile(data.fileId)(context));

      // Get file metadata
      const metadata = await step.run("get-file-metadata", async () => {
        const res = await oauthAuthenticatedFetch(
          grant,
          `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size`,
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

      // Download file content
      const content = await step.run("download-file-content", async () => {
        const res = await oauthAuthenticatedFetch(
          grant,
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Google Drive API rejected the download with status ${res.status}.`);
        }

        return await res.text();
      });

      await publish(
        googleDriveDownloadFileChannel().status({ nodeId, status: "success" })
      );

      return {
        ...context,
        ...(data.variableName
          ? {
              [data.variableName]: {
                id: metadata.id,
                name: metadata.name,
                mimeType: metadata.mimeType,
                size: metadata.size,
                content,
              },
            }
          : {}),
      };
    } catch (error) {
      await publish(
        googleDriveDownloadFileChannel().status({ nodeId, status: "error" })
      );
      throw error;
    }
  };
