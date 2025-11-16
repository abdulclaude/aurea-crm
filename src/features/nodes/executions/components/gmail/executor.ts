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
  if (!template) return undefined;
  return Handlebars.compile(template)(context).trim();
};

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
  await publish(gmailChannel().status({ nodeId, status: "loading" }));

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
      "",
      body,
    ].filter(Boolean) as string[];

    const encoded = encodeMessage(headerLines.join("\r\n"));

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

    await publish(gmailChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [data.variableName]: result,
    };
  } catch (error) {
    await publish(gmailChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
