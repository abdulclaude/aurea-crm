import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";

import { NodeType } from "@/db/enums";
import type { NodeExecutor } from "@/features/executions/types";
import { resolveGoogleMailProviderGrant } from "@/features/nodes/lib/resolve-google-mail-provider-grant";
import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import { gmailSendEmailChannel } from "@/inngest/channels/gmail-send-email";
import { decode } from "html-entities";
import {
  formatGmailAddressList,
  safeGmailHeaderValue,
} from "../gmail-message-headers";
import { z } from "zod";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GmailSendEmailData = {
  providerAccountId?: string;
  variableName?: string;
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
};

const gmailSendResponseSchema = z.object({
  id: z.string().optional(),
  threadId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
});

export const gmailSendEmailExecutor: NodeExecutor<GmailSendEmailData> =
  async ({ data, nodeId, scope, context, step, publish }) => {
    await publish(
      gmailSendEmailChannel().status({ nodeId, status: "loading" })
    );

    try {
      if (!data.to || !data.subject || !data.body) {
        await publish(
          gmailSendEmailChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Gmail Send Email: To, subject, and body are required"
        );
      }

      const grant = await step.run("get-gmail-token", async () =>
        resolveGoogleMailProviderGrant({
          nodeType: NodeType.GMAIL_SEND_EMAIL,
          providerAccountId: data.providerAccountId,
          scope,
        })
      );
      const { accessToken } = grant;

      // Compile templates
      const to = decode(Handlebars.compile(data.to)(context));
      const subject = decode(Handlebars.compile(data.subject)(context));
      const body = decode(Handlebars.compile(data.body)(context));
      const cc = data.cc ? decode(Handlebars.compile(data.cc)(context)) : undefined;
      const bcc = data.bcc ? decode(Handlebars.compile(data.bcc)(context)) : undefined;
      const toHeader = formatGmailAddressList("Recipients", to);
      const ccHeader = formatGmailAddressList("Cc", cc);
      const bccHeader = formatGmailAddressList("Bcc", bcc);

      // Create RFC 2822 formatted email
      const emailLines = [
        `To: ${toHeader}`,
        `Subject: ${safeGmailHeaderValue("Subject", subject)}`,
      ];

      if (ccHeader) emailLines.push(`Cc: ${ccHeader}`);
      if (bccHeader) emailLines.push(`Bcc: ${bccHeader}`);

      emailLines.push(`Content-Type: text/html; charset=utf-8`);
      emailLines.push("");
      emailLines.push(body);

      const email = emailLines.join("\r\n");

      // Base64 encode the email (URL-safe)
      const encodedEmail = Buffer.from(email)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      // Send email via Gmail API
      const response = await step.run("send-gmail-email", async () => {
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
            }),
          }
        );

        if (!res.ok) {
          throw new NonRetriableError(
            `Gmail API rejected the message with status ${res.status}.`,
          );
        }

        const payload: unknown = await res.json();
        return gmailSendResponseSchema.parse(payload);
      });

      await publish(
        gmailSendEmailChannel().status({ nodeId, status: "success" })
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
        gmailSendEmailChannel().status({ nodeId, status: "error" })
      );
      throw error;
    }
  };
