import { Buffer } from "node:buffer";
import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";

import type { NodeExecutor } from "@/features/executions/types";
import { gmailChannel } from "@/inngest/channels/gmail";
import { auth } from "@/lib/auth";
import { fetchGmailProfile } from "@/features/gmail/server/profile";

export type GmailExecutionData = {
  variableName?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  bodyFormat?: "text/plain" | "text/html";
  fromName?: string;
  replyTo?: string;
};

const compileTemplate = (
  template: string | undefined,
  context: Record<string, unknown>
) => {
  if (!template) {
    console.log("[compileTemplate] Template is empty/undefined");
    return undefined;
  }

  console.log("[compileTemplate] Input template:", template.substring(0, 100));

  // First, try to resolve {{variable}} syntax (without Handlebars)
  let resolved = template;
  const matches = template.match(/\{\{(.+?)\}\}/g);

  console.log("[compileTemplate] Matches found:", matches);

  if (matches) {
    for (const match of matches) {
      const path = match.slice(2, -2).trim();
      console.log("[compileTemplate] Resolving path:", path);

      // Try to get value from context.variables first, then root context
      let value = getNestedValue(context.variables as Record<string, unknown>, path);
      if (value === undefined) {
        value = getNestedValue(context, path);
      }

      console.log("[compileTemplate] Resolved value:", value);

      // Replace with the resolved value
      if (value !== undefined) {
        resolved = resolved.replace(match, String(value));
        console.log("[compileTemplate] After replacement:", resolved.substring(0, 100));
      }
    }
  }

  // Then apply Handlebars for any remaining template logic
  try {
    const result = Handlebars.compile(resolved)(context).trim();
    console.log("[compileTemplate] Final result:", result.substring(0, 100));
    return result;
  } catch (error) {
    console.log("[compileTemplate] Handlebars error, returning resolved:", error);
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

const encodeMessage = (message: string) =>
  Buffer.from(message, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const formatAddressList = (value?: string) =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");

const formatFromHeader = (displayName: string | undefined, email: string) => {
  if (!email) {
    return `From: noreply@example.com`;
  }

  if (!displayName) {
    return `From: ${email}`;
  }

  const sanitized = displayName.replace(/"/g, '\\"');
  return `From: "${sanitized}" <${email}>`;
};

export const gmailExecutor: NodeExecutor<GmailExecutionData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await step.run(`gmail-${nodeId}-publish-loading`, async () => {
    await publish(gmailChannel().status({ nodeId, status: "loading" }));
  });

  try {
    console.log("Gmail Executor - Context received:", JSON.stringify(context, null, 2));
    console.log("Gmail Executor - data.subject:", data.subject);
    console.log("Gmail Executor - data.body:", data.body);
    if (!data.variableName) {
      throw new NonRetriableError("Variable name is required for Gmail nodes.");
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

    console.log("Gmail Executor - Before compilation:");
    console.log("  data.to:", data.to);
    console.log("  data.subject:", data.subject);
    console.log("  data.body:", data.body);
    console.log("  data.bodyFormat:", data.bodyFormat);

    const [to, cc, bcc, subject, body, fromName, replyTo] = [
      data.to,
      data.cc,
      data.bcc,
      data.subject,
      data.body,
      data.fromName,
      data.replyTo,
    ].map((value) => compileTemplate(value, context));

    console.log("Gmail Executor - After compilation:");
    console.log("  to:", to);
    console.log("  subject:", subject);
    console.log("  body:", body);
    console.log("  body length:", body?.length);
    console.log("  body type:", typeof body);

    if (!to || !subject || !body) {
      throw new NonRetriableError(
        "Unable to resolve dynamic values. Check your templates."
      );
    }

    const tokenResponse = await auth.api.getAccessToken({
      body: {
        providerId: "google",
        userId,
      },
    });

    const accessToken = tokenResponse?.accessToken;
    if (!accessToken) {
      throw new NonRetriableError(
        "Gmail is not connected. Please reconnect the integration."
      );
    }

    const profile = await step.run("gmail-fetch-profile", async () =>
      fetchGmailProfile(accessToken)
    );
    const senderEmail = profile.emailAddress;

    console.log("[Gmail] Before header construction:");
    console.log("  body variable:", body);
    console.log("  body length:", body?.length);
    console.log("  data.bodyFormat:", data.bodyFormat);

    const headerLines = [
      formatFromHeader(fromName, senderEmail),
      `To: ${formatAddressList(to)}`,
      formatAddressList(cc) ? `Cc: ${formatAddressList(cc)}` : undefined,
      formatAddressList(bcc) ? `Bcc: ${formatAddressList(bcc)}` : undefined,
      replyTo ? `Reply-To: ${replyTo}` : undefined,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Transfer-Encoding: 8bit",
      `Content-Type: ${data.bodyFormat || "text/plain"}; charset="UTF-8"`,
    ].filter(Boolean) as string[];

    // Add blank line separator and body
    headerLines.push("");
    headerLines.push(body);

    console.log("[Gmail] After header construction:");
    console.log("  headerLines array length:", headerLines.length);
    console.log("  Last element (should be body):", headerLines[headerLines.length - 1]);

    const joinedHeaders = headerLines.join("\r\n");
    console.log("[Gmail] Joined headers:");
    console.log("  Total length:", joinedHeaders.length);
    console.log("  Last 200 chars:", joinedHeaders.slice(-200));

    const encoded = encodeMessage(joinedHeaders);
    console.log("[Gmail] Encoded message:");
    console.log("  Encoded length:", encoded.length);
    console.log("  First 100 chars:", encoded.substring(0, 100));

    const result = await step.run("gmail-send-message", async () => {
      const response = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: encoded }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new NonRetriableError(
          `Gmail API error (${response.status}): ${errorText}`
        );
      }

      return response.json();
    });

    await step.run(`gmail-${nodeId}-publish-success`, async () => {
      await publish(gmailChannel().status({ nodeId, status: "success" }));
    });

    return {
      ...context,
      [data.variableName]: result,
    };
  } catch (error) {
    await step.run(`gmail-${nodeId}-publish-error`, async () => {
      await publish(gmailChannel().status({ nodeId, status: "error" }));
    });
    throw error;
  }
};
