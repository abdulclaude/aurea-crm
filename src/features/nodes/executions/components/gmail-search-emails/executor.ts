import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import { z } from "zod";

import { NodeType } from "@/db/enums";
import type { NodeExecutor } from "@/features/executions/types";
import { resolveGoogleMailProviderGrant } from "@/features/nodes/lib/resolve-google-mail-provider-grant";
import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import { gmailSearchEmailsChannel } from "@/inngest/channels/gmail-search-emails";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GmailSearchEmailsData = {
  providerAccountId?: string;
  variableName?: string;
  query: string;
  maxResults?: number;
};

const gmailHeaderSchema = z.object({
  name: z.string(),
  value: z.string().optional(),
});

const gmailMessagePartSchema = z.object({
  mimeType: z.string().optional(),
  body: z
    .object({
      data: z.string().optional(),
    })
    .optional(),
});

const gmailMessageSchema = z.object({
  id: z.string(),
  threadId: z.string().optional(),
  snippet: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  payload: z.object({
    headers: z.array(gmailHeaderSchema),
    body: z
      .object({
        data: z.string().optional(),
      })
      .optional(),
    parts: z.array(gmailMessagePartSchema).optional(),
  }),
});

const gmailSearchResponseSchema = z.object({
  messages: z.array(z.object({ id: z.string() })).optional(),
});

export const gmailSearchEmailsExecutor: NodeExecutor<GmailSearchEmailsData> =
  async ({ data, nodeId, scope, context, step, publish }) => {
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

      const grant = await step.run("get-gmail-token", async () =>
        resolveGoogleMailProviderGrant({
          nodeType: NodeType.GMAIL_SEARCH_EMAILS,
          providerAccountId: data.providerAccountId,
          scope,
        })
      );
      const { accessToken } = grant;

      // Compile template
      const query = decode(Handlebars.compile(data.query)(context));
      const maxResults = data.maxResults || 10;

      // Search for messages
      const searchResponse = await step.run("search-gmail-messages", async () => {
        const params = new URLSearchParams({
          q: query,
          maxResults: maxResults.toString(),
        });

        const res = await oauthAuthenticatedFetch(
          grant,
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Gmail API rejected the search with status ${res.status}.`);
        }

        const payload: unknown = await res.json();
        return gmailSearchResponseSchema.parse(payload);
      });

      const messageIds = searchResponse.messages || [];

      // Get full details for each message
      const messages = await step.run("get-message-details", async () => {
        const messagePromises = messageIds.map(async (msg: { id: string }) => {
          const res = await oauthAuthenticatedFetch(
            grant,
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

          const payload: unknown = await res.json();
          const message = gmailMessageSchema.parse(payload);
          const headers = message.payload.headers;

          // Extract key headers
          const from = headers.find((header) => header.name === "From")?.value || "";
          const to = headers.find((header) => header.name === "To")?.value || "";
          const subject =
            headers.find((header) => header.name === "Subject")?.value || "";
          const date = headers.find((header) => header.name === "Date")?.value || "";

          // Extract body (simplified - takes first text/plain or text/html part)
          let body = "";
          if (message.payload.body?.data) {
            body = Buffer.from(message.payload.body.data, "base64").toString();
          } else if (message.payload.parts) {
            const textPart = message.payload.parts.find(
              (part) =>
                part.mimeType === "text/plain" || part.mimeType === "text/html"
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
