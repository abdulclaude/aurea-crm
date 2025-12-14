import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { googleDriveDownloadFileChannel } from "@/inngest/channels/google-drive-download-file";
import { auth } from "@/lib/auth";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GoogleDriveDownloadFileData = {
  variableName?: string;
  fileId: string;
};

export const googleDriveDownloadFileExecutor: NodeExecutor<GoogleDriveDownloadFileData> =
  async ({ data, nodeId, userId, context, step, publish }) => {
    await publish(
      googleDriveDownloadFileChannel().status({ nodeId, status: "loading" })
    );

    try {
      if (!data.fileId) {
        await publish(
          googleDriveDownloadFileChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError("Google Drive: File ID is required");
      }

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
          googleDriveDownloadFileChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Drive is not connected. Please connect Google in Settings → Apps."
        );
      }

      const fileId = decode(Handlebars.compile(data.fileId)(context));

      // Get file metadata
      const metadata = await step.run("get-file-metadata", async () => {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size`,
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

      // Download file content
      const content = await step.run("download-file-content", async () => {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
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
