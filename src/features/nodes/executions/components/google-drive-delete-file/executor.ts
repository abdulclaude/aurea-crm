import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";

import { NodeType } from "@/db/enums";
import type { NodeExecutor } from "@/features/executions/types";
import { resolveOAuthProviderGrant } from "@/features/provider-accounts/server/oauth-resolver";
import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import { getWorkflowProviderBindingSpec } from "@/features/workflows/lib/workflow-provider-binding";
import { googleDriveDeleteFileChannel } from "@/inngest/channels/google-drive-delete-file";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GoogleDriveDeleteFileData = {
  providerAccountId: string;
  variableName?: string;
  fileId: string;
};

const providerBinding = getWorkflowProviderBindingSpec(
  NodeType.GOOGLE_DRIVE_DELETE_FILE,
);

export const googleDriveDeleteFileExecutor: NodeExecutor<GoogleDriveDeleteFileData> =
  async ({ data, nodeId, scope, context, step, publish }) => {
    await publish(
      googleDriveDeleteFileChannel().status({ nodeId, status: "loading" })
    );

    try {
      if (!data.providerAccountId || !data.fileId) {
        await publish(
          googleDriveDeleteFileChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Drive: Account and file ID are required"
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

      // Delete file
      await step.run("delete-file", async () => {
        const res = await oauthAuthenticatedFetch(
          grant,
          `https://www.googleapis.com/drive/v3/files/${fileId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Google Drive API rejected the request with status ${res.status}.`);
        }
      });

      await publish(
        googleDriveDeleteFileChannel().status({ nodeId, status: "success" })
      );

      return {
        ...context,
        ...(data.variableName
          ? {
              [data.variableName]: {
                success: true,
                fileId: fileId,
                deletedAt: new Date().toISOString(),
              },
            }
          : {}),
      };
    } catch (error) {
      await publish(
        googleDriveDeleteFileChannel().status({ nodeId, status: "error" })
      );
      throw error;
    }
  };
