import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { googleDriveUploadFileChannel } from "@/inngest/channels/google-drive-upload-file";
import { auth } from "@/lib/auth";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GoogleDriveUploadFileData = {
  variableName?: string;
  fileName: string;
  content: string;
  mimeType?: string;
  parentFolderId?: string;
};

export const googleDriveUploadFileExecutor: NodeExecutor<GoogleDriveUploadFileData> =
  async ({ data, nodeId, userId, context, step, publish }) => {
    await publish(
      googleDriveUploadFileChannel().status({ nodeId, status: "loading" })
    );

    try {
      if (!data.fileName || !data.content) {
        await publish(
          googleDriveUploadFileChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Drive: File name and content are required"
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
          googleDriveUploadFileChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Drive is not connected. Please connect Google in Settings → Apps."
        );
      }

      // Compile templates
      const fileName = decode(Handlebars.compile(data.fileName)(context));
      const content = decode(Handlebars.compile(data.content)(context));
      const mimeType = data.mimeType
        ? decode(Handlebars.compile(data.mimeType)(context))
        : "text/plain";
      const parentFolderId = data.parentFolderId
        ? decode(Handlebars.compile(data.parentFolderId)(context))
        : undefined;

      // Create metadata
      const metadata: any = {
        name: fileName,
        mimeType,
      };

      if (parentFolderId) {
        metadata.parents = [parentFolderId];
      }

      // Upload file using multipart upload
      const boundary = "-------314159265358979323846";
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        "Content-Type: application/json\r\n\r\n" +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType}\r\n\r\n` +
        content +
        closeDelim;

      const response = await step.run("upload-file", async () => {
        const res = await fetch(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
          {
            method: "POST",
            headers: {
              "Content-Type": `multipart/related; boundary=${boundary}`,
              Authorization: `Bearer ${accessToken}`,
            },
            body: multipartRequestBody,
          }
        );

        if (!res.ok) {
          const error = await res.text();
          throw new Error(`Google Drive API error: ${error}`);
        }

        return await res.json();
      });

      await publish(
        googleDriveUploadFileChannel().status({ nodeId, status: "success" })
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
              },
            }
          : {}),
      };
    } catch (error) {
      await publish(
        googleDriveUploadFileChannel().status({ nodeId, status: "error" })
      );
      throw error;
    }
  };
