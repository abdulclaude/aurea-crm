import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import { z } from "zod";

import { NodeType } from "@/db/enums";
import type { NodeExecutor } from "@/features/executions/types";
import { resolveOAuthProviderGrant } from "@/features/provider-accounts/server/oauth-resolver";
import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import { getWorkflowProviderBindingSpec } from "@/features/workflows/lib/workflow-provider-binding";
import { googleDriveUploadFileChannel } from "@/inngest/channels/google-drive-upload-file";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GoogleDriveUploadFileData = {
  providerAccountId: string;
  variableName?: string;
  fileName: string;
  content: string;
  mimeType?: string;
  parentFolderId?: string;
};

type GoogleDriveFileMetadata = {
  name: string;
  mimeType: string;
  parents?: string[];
};

const googleDriveFileResponseSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  mimeType: z.string().optional(),
  webViewLink: z.string().optional(),
});

const providerBinding = getWorkflowProviderBindingSpec(
  NodeType.GOOGLE_DRIVE_UPLOAD_FILE,
);

export const googleDriveUploadFileExecutor: NodeExecutor<GoogleDriveUploadFileData> =
  async ({ data, nodeId, scope, context, step, publish }) => {
    await publish(
      googleDriveUploadFileChannel().status({ nodeId, status: "loading" })
    );

    try {
      if (!data.providerAccountId || !data.fileName || !data.content) {
        await publish(
          googleDriveUploadFileChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Google Drive: Account, file name, and content are required"
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
      const fileName = decode(Handlebars.compile(data.fileName)(context));
      const content = decode(Handlebars.compile(data.content)(context));
      const mimeType = data.mimeType
        ? decode(Handlebars.compile(data.mimeType)(context))
        : "text/plain";
      const parentFolderId = data.parentFolderId
        ? decode(Handlebars.compile(data.parentFolderId)(context))
        : undefined;

      // Create metadata
      const metadata: GoogleDriveFileMetadata = {
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
        const res = await oauthAuthenticatedFetch(
          grant,
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
          throw new Error(`Google Drive API rejected the upload with status ${res.status}.`);
        }

        const payload: unknown = await res.json();
        return googleDriveFileResponseSchema.parse(payload);
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
