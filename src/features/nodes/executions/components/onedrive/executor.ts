import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";

import type { NodeExecutor } from "@/features/executions/types";
import { oneDriveChannel } from "@/inngest/channels/onedrive";
import { auth } from "@/lib/auth";

export type OneDriveExecutionData = {
  variableName?: string;
  action?: "upload" | "download" | "delete";
  filePath?: string;
  content?: string;
};

const compileTemplate = (
  template: string | undefined,
  context: Record<string, unknown>
) => {
  if (!template) {
    return undefined;
  }

  // First, try to resolve {{variable}} syntax
  let resolved = template;
  const matches = template.match(/\{\{(.+?)\}\}/g);

  if (matches) {
    for (const match of matches) {
      const path = match.slice(2, -2).trim();

      // Try to get value from context.variables first, then root context
      let value = getNestedValue(context.variables as Record<string, unknown>, path);
      if (value === undefined) {
        value = getNestedValue(context, path);
      }

      // Replace with the resolved value
      if (value !== undefined) {
        resolved = resolved.replace(match, String(value));
      }
    }
  }

  // Then apply Handlebars for any remaining template logic
  try {
    return Handlebars.compile(resolved)(context).trim();
  } catch (error) {
    return resolved.trim();
  }
};

// Helper function to get nested values from object using dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((current, key) => {
    if (current && typeof current === "object") {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

export const oneDriveExecutor: NodeExecutor<OneDriveExecutionData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await step.run(`onedrive-${nodeId}-publish-loading`, async () => {
    await publish(oneDriveChannel().status({ nodeId, status: "loading" }));
  });

  try {
    if (!data.variableName) {
      throw new NonRetriableError("Variable name is required for OneDrive nodes.");
    }

    if (!data.action) {
      throw new NonRetriableError("Action is required.");
    }

    if (!data.filePath) {
      throw new NonRetriableError("File path is required.");
    }

    const filePath = compileTemplate(data.filePath, context);
    const content = data.action === "upload" ? compileTemplate(data.content, context) : undefined;

    if (!filePath) {
      throw new NonRetriableError(
        "Unable to resolve file path. Check your templates."
      );
    }

    if (data.action === "upload" && !content) {
      throw new NonRetriableError("Content is required for upload action.");
    }

    const tokenResponse = await auth.api.getAccessToken({
      body: {
        providerId: "microsoft",
        userId,
      },
    });

    const accessToken = tokenResponse?.accessToken;
    if (!accessToken) {
      throw new NonRetriableError(
        "OneDrive is not connected. Please connect Microsoft account."
      );
    }

    let result;

    if (data.action === "upload") {
      result = await step.run("onedrive-upload-file", async () => {
        const response = await fetch(
          `https://graph.microsoft.com/v1.0/me/drive/root:${filePath}:/content`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "text/plain",
            },
            body: content,
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new NonRetriableError(
            `Microsoft Graph API error (${response.status}): ${errorText}`
          );
        }

        return response.json();
      });
    } else if (data.action === "download") {
      result = await step.run("onedrive-download-file", async () => {
        const response = await fetch(
          `https://graph.microsoft.com/v1.0/me/drive/root:${filePath}:/content`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new NonRetriableError(
            `Microsoft Graph API error (${response.status}): ${errorText}`
          );
        }

        const content = await response.text();
        return { content, size: content.length };
      });
    } else if (data.action === "delete") {
      result = await step.run("onedrive-delete-file", async () => {
        const response = await fetch(
          `https://graph.microsoft.com/v1.0/me/drive/root:${filePath}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new NonRetriableError(
            `Microsoft Graph API error (${response.status}): ${errorText}`
          );
        }

        return { success: true, filePath };
      });
    }

    await step.run(`onedrive-${nodeId}-publish-success`, async () => {
      await publish(oneDriveChannel().status({ nodeId, status: "success" }));
    });

    return {
      ...context,
      [data.variableName]: result,
    };
  } catch (error) {
    await step.run(`onedrive-${nodeId}-publish-error`, async () => {
      await publish(oneDriveChannel().status({ nodeId, status: "error" }));
    });
    throw error;
  }
};
