import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { gmailSendEmailChannel } from "@/inngest/channels/gmail-send-email";
import { auth } from "@/lib/auth";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GmailSendEmailData = {
  variableName?: string;
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
};

export const gmailSendEmailExecutor: NodeExecutor<GmailSendEmailData> =
  async ({ data, nodeId, userId, context, step, publish }) => {
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

      // Get Gmail OAuth token
      const tokenResponse = await step.run("get-gmail-token", async () => {
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
          gmailSendEmailChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Gmail is not connected. Please connect Gmail in Settings → Apps."
        );
      }

      // Compile templates
      const to = decode(Handlebars.compile(data.to)(context));
      const subject = decode(Handlebars.compile(data.subject)(context));
      const body = decode(Handlebars.compile(data.body)(context));
      const cc = data.cc ? decode(Handlebars.compile(data.cc)(context)) : undefined;
      const bcc = data.bcc ? decode(Handlebars.compile(data.bcc)(context)) : undefined;

      // Create RFC 2822 formatted email
      const emailLines = [
        `To: ${to}`,
        `Subject: ${subject}`,
      ];

      if (cc) emailLines.push(`Cc: ${cc}`);
      if (bcc) emailLines.push(`Bcc: ${bcc}`);

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
        const res = await fetch(
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
          const error = await res.text();
          throw new Error(`Gmail API error: ${error}`);
        }

        return await res.json();
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
