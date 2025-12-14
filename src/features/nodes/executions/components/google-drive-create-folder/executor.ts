import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { googleDriveCreateFolderChannel } from "@/inngest/channels/google-drive-create-folder";
import { auth } from "@/lib/auth";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GoogleDriveCreateFolderData = {
  variableName?: string;
  folderName: string;
  parentFolderId?: string;
};

export const googleDriveCreateFolderExecutor: NodeExecutor<GoogleDriveCreateFolderData> =
  async ({ data, nodeId, userId, context, step, publish }) => {
    await publish(
      googleDriveCreateFolderChannel().status({ nodeId, status: "loading" })
    );

    try {
      if (!data.folderName) {
        await publish(
          googleDriveCreateFolderChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Drive: Folder name is required"
        );
      }

      // Get Google OAuth token
      const tokenResponse = await step.run("get-google-token", async () => {
        return await auth.api.getAccessToken({
          body: {
            providerId: "google",
            userId,
          },
        });
      });

      const accessToken = tokenResponse?.accessToken;

      if (!accessToken) {
        await publish(
          googleDriveCreateFolderChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Drive is not connected. Please connect Google in Settings → Apps."
        );
      }

      // Compile templates
      const folderName = decode(Handlebars.compile(data.folderName)(context));
      const parentFolderId = data.parentFolderId
        ? decode(Handlebars.compile(data.parentFolderId)(context))
        : undefined;

      // Create metadata for folder
      const metadata: any = {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
      };

      if (parentFolderId) {
        metadata.parents = [parentFolderId];
      }

      // Create folder
      const response = await step.run("create-folder", async () => {
        const res = await fetch(
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
          const error = await res.text();
          throw new Error(`Google Drive API error: ${error}`);
        }

        return await res.json();
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
