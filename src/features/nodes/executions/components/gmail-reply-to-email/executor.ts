import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { gmailReplyToEmailChannel } from "@/inngest/channels/gmail-reply-to-email";
import { auth } from "@/lib/auth";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GmailReplyToEmailData = {
  variableName?: string;
  messageId: string;
  replyBody: string;
};

export const gmailReplyToEmailExecutor: NodeExecutor<GmailReplyToEmailData> =
  async ({ data, nodeId, userId, context, step, publish }) => {
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
          gmailReplyToEmailChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Gmail is not connected. Please connect Gmail in Settings → Apps."
        );
      }

      // Compile templates
      const messageId = decode(Handlebars.compile(data.messageId)(context));
      const replyBody = decode(Handlebars.compile(data.replyBody)(context));

      // Get the original message to extract thread ID and headers
      const originalMessage = await step.run(
        "get-original-message",
        async () => {
          const res = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (!res.ok) {
            const error = await res.text();
            throw new Error(`Gmail API error: ${error}`);
          }

          return await res.json();
        }
      );

      const threadId = originalMessage.threadId;
      const headers = originalMessage.payload.headers;
      const subject = headers.find((h: any) => h.name === "Subject")?.value || "";
      const to = headers.find((h: any) => h.name === "From")?.value || "";
      const messageIdHeader = headers.find((h: any) => h.name === "Message-ID")?.value || "";
      const references = headers.find((h: any) => h.name === "References")?.value || "";

      // Create RFC 2822 formatted reply email
      const emailLines = [
        `To: ${to}`,
        `Subject: Re: ${subject.replace(/^Re: /, "")}`,
        `In-Reply-To: ${messageIdHeader}`,
        `References: ${references} ${messageIdHeader}`.trim(),
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
              threadId: threadId,
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
