import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { googleDriveDeleteFileChannel } from "@/inngest/channels/google-drive-delete-file";
import { auth } from "@/lib/auth";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GoogleDriveDeleteFileData = {
  variableName?: string;
  fileId: string;
};

export const googleDriveDeleteFileExecutor: NodeExecutor<GoogleDriveDeleteFileData> =
  async ({ data, nodeId, userId, context, step, publish }) => {
    await publish(
      googleDriveDeleteFileChannel().status({ nodeId, status: "loading" })
    );

    try {
      if (!data.fileId) {
        await publish(
          googleDriveDeleteFileChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Drive: File ID is required"
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
          googleDriveDeleteFileChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Drive is not connected. Please connect Google in Settings → Apps."
        );
      }

      // Compile templates
      const fileId = decode(Handlebars.compile(data.fileId)(context));

      // Delete file
      await step.run("delete-file", async () => {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!res.ok) {
          const error = await res.text();
          throw new Error(`Google Drive API error: ${error}`);
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
