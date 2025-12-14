import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { googleDriveMoveFileChannel } from "@/inngest/channels/google-drive-move-file";
import { auth } from "@/lib/auth";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GoogleDriveMoveFileData = {
  variableName?: string;
  fileId: string;
  newParentId: string;
};

export const googleDriveMoveFileExecutor: NodeExecutor<GoogleDriveMoveFileData> =
  async ({ data, nodeId, userId, context, step, publish }) => {
    await publish(
      googleDriveMoveFileChannel().status({ nodeId, status: "loading" })
    );

    try {
      if (!data.fileId || !data.newParentId) {
        await publish(
          googleDriveMoveFileChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Drive: File ID and new parent folder ID are required"
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
          googleDriveMoveFileChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Drive is not connected. Please connect Google in Settings → Apps."
        );
      }

      // Compile templates
      const fileId = decode(Handlebars.compile(data.fileId)(context));
      const newParentId = decode(Handlebars.compile(data.newParentId)(context));

      // Get current parents
      const fileMetadata = await step.run("get-file-metadata", async () => {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!res.ok) {
          const error = await res.text();
          throw new Error(`Google Drive API error: ${error}`);
        }

        return await res.json();
      });

      const previousParents = fileMetadata.parents
        ? fileMetadata.parents.join(",")
        : "";

      // Move file
      const response = await step.run("move-file", async () => {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${newParentId}&removeParents=${previousParents}&fields=id,name,mimeType,webViewLink,parents`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!res.ok) {
          const error = await res.text();
          throw new Error(`Google Drive API error: ${error}`);
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
