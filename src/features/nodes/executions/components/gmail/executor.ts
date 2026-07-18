import { Buffer } from "node:buffer";
import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";

import { NodeType } from "@/db/enums";
import type { NodeExecutor } from "@/features/executions/types";
import { fetchGmailProfile } from "@/features/gmail/server/profile";
import { resolveGoogleMailProviderGrant } from "@/features/nodes/lib/resolve-google-mail-provider-grant";
import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import { gmailChannel } from "@/inngest/channels/gmail";
import {
  formatGmailAddressList,
  formatGmailFromHeader,
  optionalSafeGmailHeaderValue,
  safeGmailHeaderValue,
} from "../gmail-message-headers";

export type GmailExecutionData = {
  providerAccountId?: string;
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
  if (!template) return undefined;

  // First, try to resolve {{variable}} syntax (without Handlebars)
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
  } catch {
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

export const gmailExecutor: NodeExecutor<GmailExecutionData> = async ({
  data,
  nodeId,
  scope,
  context,
  step,
  publish,
}) => {
  await step.run(`gmail-${nodeId}-publish-loading`, async () => {
    await publish(gmailChannel().status({ nodeId, status: "loading" }));
  });

  try {
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

    const [to, cc, bcc, subject, body, fromName, replyTo] = [
      data.to,
      data.cc,
      data.bcc,
      data.subject,
      data.body,
      data.fromName,
      data.replyTo,
    ].map((value) => compileTemplate(value, context));

    if (!to || !subject || !body) {
      throw new NonRetriableError(
        "Unable to resolve dynamic values. Check your templates."
      );
    }

    const grant = await resolveGoogleMailProviderGrant({
      nodeType: NodeType.GMAIL_EXECUTION,
      providerAccountId: data.providerAccountId,
      scope,
    });
    const { accessToken } = grant;

    const profile = await step.run("gmail-fetch-profile", async () =>
      fetchGmailProfile(grant)
    );
    const senderEmail = profile.emailAddress;
    const toHeader = formatGmailAddressList("Recipients", to);
    const ccHeader = formatGmailAddressList("Cc", cc);
    const bccHeader = formatGmailAddressList("Bcc", bcc);

    const headerLines = [
      formatGmailFromHeader(fromName, senderEmail),
      `To: ${toHeader}`,
      ccHeader ? `Cc: ${ccHeader}` : undefined,
      bccHeader ? `Bcc: ${bccHeader}` : undefined,
      optionalSafeGmailHeaderValue("Reply-To", replyTo)
        ? `Reply-To: ${optionalSafeGmailHeaderValue("Reply-To", replyTo)}`
        : undefined,
      `Subject: ${safeGmailHeaderValue("Subject", subject)}`,
      "MIME-Version: 1.0",
      "Content-Transfer-Encoding: 8bit",
      `Content-Type: ${data.bodyFormat || "text/plain"}; charset="UTF-8"`,
    ].filter(Boolean) as string[];

    // Add blank line separator and body
    headerLines.push("");
    headerLines.push(body);

    const joinedHeaders = headerLines.join("\r\n");
    const encoded = encodeMessage(joinedHeaders);

    const result = await step.run("gmail-send-message", async () => {
      const response = await oauthAuthenticatedFetch(
        grant,
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
        throw new NonRetriableError(
          `Gmail API rejected the message with status ${response.status}.`,
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
