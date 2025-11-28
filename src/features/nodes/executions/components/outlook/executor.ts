import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";

import type { NodeExecutor } from "@/features/executions/types";
import { outlookChannel } from "@/inngest/channels/outlook";
import { auth } from "@/lib/auth";

export type OutlookExecutionData = {
  variableName?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  bodyFormat?: "text" | "html";
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

const formatAddressList = (value?: string) =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((email) => ({ emailAddress: { address: email } }));

export const outlookExecutor: NodeExecutor<OutlookExecutionData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await step.run(`outlook-${nodeId}-publish-loading`, async () => {
    await publish(outlookChannel().status({ nodeId, status: "loading" }));
  });

  try {
    if (!data.variableName) {
      throw new NonRetriableError("Variable name is required for Outlook nodes.");
    }

    if (!data.to) {
      throw new NonRetriableError("At least one recipient is required.");
    }

    if (!data.subject) {
      throw new NonRetriableError("Subject is required.");
    }

    if (!data.body) {
      throw new NonRetriableError("Body content is required.");
    }

    const [to, cc, bcc, subject, body] = [
      data.to,
      data.cc,
      data.bcc,
      data.subject,
      data.body,
    ].map((value) => compileTemplate(value, context));

    if (!to || !subject || !body) {
      throw new NonRetriableError(
        "Unable to resolve dynamic values. Check your templates."
      );
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
        "Outlook is not connected. Please connect Microsoft account."
      );
    }

    const message = {
      subject,
      body: {
        contentType: data.bodyFormat || "text",
        content: body,
      },
      toRecipients: formatAddressList(to),
      ...(cc && { ccRecipients: formatAddressList(cc) }),
      ...(bcc && { bccRecipients: formatAddressList(bcc) }),
    };

    const result = await step.run("outlook-send-message", async () => {
      const response = await fetch(
        "https://graph.microsoft.com/v1.0/me/sendMail",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new NonRetriableError(
          `Microsoft Graph API error (${response.status}): ${errorText}`
        );
      }

      // sendMail returns 202 with no body on success
      return { success: true, messageId: response.headers.get("request-id") };
    });

    await step.run(`outlook-${nodeId}-publish-success`, async () => {
      await publish(outlookChannel().status({ nodeId, status: "success" }));
    });

    return {
      ...context,
      [data.variableName]: result,
    };
  } catch (error) {
    await step.run(`outlook-${nodeId}-publish-error`, async () => {
      await publish(outlookChannel().status({ nodeId, status: "error" }));
    });
    throw error;
  }
};
