import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import { z } from "zod";

import { NodeType } from "@/db/enums";
import type { NodeExecutor } from "@/features/executions/types";
import { resolveGoogleMailProviderGrant } from "@/features/nodes/lib/resolve-google-mail-provider-grant";
import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import { gmailReplyToEmailChannel } from "@/inngest/channels/gmail-reply-to-email";
import { decode } from "html-entities";
import { safeGmailHeaderValue } from "../gmail-message-headers";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GmailReplyToEmailData = {
  providerAccountId?: string;
  variableName?: string;
  messageId: string;
  replyBody: string;
};

const gmailHeaderSchema = z.object({
  name: z.string(),
  value: z.string().optional(),
});

const gmailOriginalMessageSchema = z.object({
  threadId: z.string(),
  payload: z.object({
    headers: z.array(gmailHeaderSchema),
  }),
});

const gmailSendResponseSchema = z.object({
  id: z.string().optional(),
  threadId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
});

export const gmailReplyToEmailExecutor: NodeExecutor<GmailReplyToEmailData> =
  async ({ data, nodeId, scope, context, step, publish }) => {
    await publish(
      gmailReplyToEmailChannel().status({ nodeId, status: "loading" })
    );

    try {
      if (!data.messageId || !data.replyBody) {
        await publish(
          gmailReplyToEmailChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Gmail Reply: Message ID and reply body are required"
        );
      }

      const grant = await step.run("get-gmail-token", async () =>
        resolveGoogleMailProviderGrant({
          nodeType: NodeType.GMAIL_REPLY_TO_EMAIL,
          providerAccountId: data.providerAccountId,
          scope,
        })
      );
      const { accessToken } = grant;

      // Compile templates
      const messageId = decode(Handlebars.compile(data.messageId)(context));
      const replyBody = decode(Handlebars.compile(data.replyBody)(context));

      // Get the original message to extract thread ID and headers
      const originalMessage = await step.run(
        "get-original-message",
        async () => {
          const res = await oauthAuthenticatedFetch(
            grant,
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=full`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (!res.ok) {
            throw new NonRetriableError(
              `Gmail API rejected the message lookup with status ${res.status}.`,
            );
          }

          const payload: unknown = await res.json();
          return gmailOriginalMessageSchema.parse(payload);
        }
      );

      const threadId = originalMessage.threadId;
      const headers = originalMessage.payload.headers;
      const subject = headers.find((header) => header.name === "Subject")?.value || "";
      const to = headers.find((header) => header.name === "From")?.value || "";
      const messageIdHeader =
        headers.find((header) => header.name === "Message-ID")?.value || "";
      const references =
        headers.find((header) => header.name === "References")?.value || "";

      // Create RFC 2822 formatted reply email
      const emailLines = [
        `To: ${safeGmailHeaderValue("Recipient", to)}`,
        `Subject: Re: ${safeGmailHeaderValue("Subject", subject.replace(/^Re: /, ""))}`,
        `In-Reply-To: ${safeGmailHeaderValue("Message-ID", messageIdHeader)}`,
        `References: ${safeGmailHeaderValue("References", `${references} ${messageIdHeader}`)}`,
        `Content-Type: text/html; charset=utf-8`,
        "",
        replyBody,
      ];

      const email = emailLines.join("\r\n");

      // Base64 encode the email (URL-safe)
      const encodedEmail = Buffer.from(email)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      // Send reply via Gmail API
      const response = await step.run("send-gmail-reply", async () => {
        const res = await oauthAuthenticatedFetch(
          grant,
          "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              raw: encodedEmail,
              threadId: threadId,
            }),
          }
        );

        if (!res.ok) {
          throw new NonRetriableError(
            `Gmail API rejected the reply with status ${res.status}.`,
          );
        }

        const payload: unknown = await res.json();
        return gmailSendResponseSchema.parse(payload);
      });

      await publish(
        gmailReplyToEmailChannel().status({ nodeId, status: "success" })
      );

      return {
        ...context,
        ...(data.variableName
          ? {
              [data.variableName]: {
                id: response.id,
                threadId: response.threadId,
                labelIds: response.labelIds,
              },
            }
          : {}),
      };
    } catch (error) {
      await publish(
        gmailReplyToEmailChannel().status({ nodeId, status: "error" })
      );
      throw error;
    }
  };
