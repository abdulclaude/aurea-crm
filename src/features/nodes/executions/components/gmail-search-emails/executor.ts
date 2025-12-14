import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { gmailSearchEmailsChannel } from "@/inngest/channels/gmail-search-emails";
import { auth } from "@/lib/auth";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GmailSearchEmailsData = {
  variableName?: string;
  query: string;
  maxResults?: number;
};

export const gmailSearchEmailsExecutor: NodeExecutor<GmailSearchEmailsData> =
  async ({ data, nodeId, userId, context, step, publish }) => {
    await publish(
      gmailSearchEmailsChannel().status({ nodeId, status: "loading" })
    );

    try {
      if (!data.query) {
        await publish(
          gmailSearchEmailsChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Gmail Search: Search query is required"
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
          gmailSearchEmailsChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Gmail is not connected. Please connect Gmail in Settings → Apps."
        );
      }

      // Compile template
      const query = decode(Handlebars.compile(data.query)(context));
      const maxResults = data.maxResults || 10;

      // Search for messages
      const searchResponse = await step.run("search-gmail-messages", async () => {
        const params = new URLSearchParams({
          q: query,
          maxResults: maxResults.toString(),
        });

        const res = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
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
      });

      const messageIds = searchResponse.messages || [];

      // Get full details for each message
      const messages = await step.run("get-message-details", async () => {
        const messagePromises = messageIds.map(async (msg: { id: string }) => {
          const res = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (!res.ok) {
            return null;
          }

          const message = await res.json();
          const headers = message.payload.headers;

          // Extract key headers
          const from = headers.find((h: any) => h.name === "From")?.value || "";
          const to = headers.find((h: any) => h.name === "To")?.value || "";
          const subject = headers.find((h: any) => h.name === "Subject")?.value || "";
          const date = headers.find((h: any) => h.name === "Date")?.value || "";

          // Extract body (simplified - takes first text/plain or text/html part)
          let body = "";
          if (message.payload.body?.data) {
            body = Buffer.from(message.payload.body.data, "base64").toString();
          } else if (message.payload.parts) {
            const textPart = message.payload.parts.find(
              (p: any) => p.mimeType === "text/plain" || p.mimeType === "text/html"
            );
            if (textPart?.body?.data) {
              body = Buffer.from(textPart.body.data, "base64").toString();
            }
          }

          return {
            id: message.id,
            threadId: message.threadId,
            from,
            to,
            subject,
            date,
            snippet: message.snippet,
            body,
            labelIds: message.labelIds,
          };
        });

        const results = await Promise.all(messagePromises);
        return results.filter((m) => m !== null);
      });

      await publish(
        gmailSearchEmailsChannel().status({ nodeId, status: "success" })
      );

      return {
        ...context,
        ...(data.variableName
          ? {
              [data.variableName]: {
                query,
                count: messages.length,
                messages,
              },
            }
          : {}),
      };
    } catch (error) {
      await publish(
        gmailSearchEmailsChannel().status({ nodeId, status: "error" })
      );
      throw error;
    }
  };
