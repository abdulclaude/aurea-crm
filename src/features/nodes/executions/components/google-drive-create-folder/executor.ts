import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import { z } from "zod";

import { NodeType } from "@/db/enums";
import type { NodeExecutor } from "@/features/executions/types";
import { resolveOAuthProviderGrant } from "@/features/provider-accounts/server/oauth-resolver";
import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import { getWorkflowProviderBindingSpec } from "@/features/workflows/lib/workflow-provider-binding";
import { googleDriveCreateFolderChannel } from "@/inngest/channels/google-drive-create-folder";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GoogleDriveCreateFolderData = {
  providerAccountId: string;
  variableName?: string;
  folderName: string;
  parentFolderId?: string;
};

type GoogleDriveFolderMetadata = {
  name: string;
  mimeType: "application/vnd.google-apps.folder";
  parents?: string[];
};

const googleDriveFolderResponseSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  mimeType: z.string().optional(),
  webViewLink: z.string().optional(),
  parents: z.array(z.string()).optional(),
});

const providerBinding = getWorkflowProviderBindingSpec(
  NodeType.GOOGLE_DRIVE_CREATE_FOLDER,
);

export const googleDriveCreateFolderExecutor: NodeExecutor<GoogleDriveCreateFolderData> =
  async ({ data, nodeId, scope, context, step, publish }) => {
    await publish(
      googleDriveCreateFolderChannel().status({ nodeId, status: "loading" })
    );

    try {
      if (!data.providerAccountId || !data.folderName) {
        await publish(
          googleDriveCreateFolderChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Drive: Account and folder name are required"
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
      const folderName = decode(Handlebars.compile(data.folderName)(context));
      const parentFolderId = data.parentFolderId
        ? decode(Handlebars.compile(data.parentFolderId)(context))
        : undefined;

      // Create metadata for folder
      const metadata: GoogleDriveFolderMetadata = {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
      };

      if (parentFolderId) {
        metadata.parents = [parentFolderId];
      }

      // Create folder
      const response = await step.run("create-folder", async () => {
        const res = await oauthAuthenticatedFetch(
          grant,
          "https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink,parents",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(metadata),
          }
        );

        if (!res.ok) {
          throw new Error(`Google Drive API rejected the request with status ${res.status}.`);
        }

        const payload: unknown = await res.json();
        return googleDriveFolderResponseSchema.parse(payload);
      });

      await publish(
        googleDriveCreateFolderChannel().status({ nodeId, status: "success" })
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
        googleDriveCreateFolderChannel().status({ nodeId, status: "error" })
      );
      throw error;
    }
  };
