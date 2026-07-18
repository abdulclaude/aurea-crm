import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import { z } from "zod";

import { NodeType } from "@/db/enums";
import type { NodeExecutor } from "@/features/executions/types";
import { resolveGoogleMailProviderGrant } from "@/features/nodes/lib/resolve-google-mail-provider-grant";
import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import { gmailAddLabelChannel } from "@/inngest/channels/gmail-add-label";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GmailAddLabelData = {
  providerAccountId?: string;
  variableName?: string;
  messageId: string;
  labelName: string;
};

const gmailLabelSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const gmailLabelsResponseSchema = z.object({
  labels: z.array(gmailLabelSchema).optional(),
});

const gmailModifyMessageResponseSchema = z.object({
  id: z.string().optional(),
  threadId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
});

export const gmailAddLabelExecutor: NodeExecutor<GmailAddLabelData> =
  async ({ data, nodeId, scope, context, step, publish }) => {
    await publish(
      gmailAddLabelChannel().status({ nodeId, status: "loading" })
    );

    try {
      if (!data.messageId || !data.labelName) {
        await publish(
          gmailAddLabelChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Gmail Add Label: Message ID and label name are required"
        );
      }

      const grant = await step.run("get-gmail-token", async () =>
        resolveGoogleMailProviderGrant({
          nodeType: NodeType.GMAIL_ADD_LABEL,
          providerAccountId: data.providerAccountId,
          scope,
        })
      );
      const { accessToken } = grant;

      // Compile templates
      const messageId = decode(Handlebars.compile(data.messageId)(context));
      const labelName = decode(Handlebars.compile(data.labelName)(context));

      // Get or create label
      const labelId = await step.run("get-or-create-label", async () => {
        // First, try to find existing label
        const listRes = await oauthAuthenticatedFetch(
          grant,
          "https://gmail.googleapis.com/gmail/v1/users/me/labels",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!listRes.ok) {
          throw new Error(`Gmail API rejected the label list with status ${listRes.status}.`);
        }

        const labelsPayload: unknown = await listRes.json();
        const labelsData = gmailLabelsResponseSchema.parse(labelsPayload);
        const existingLabel = labelsData.labels?.find(
          (label) => label.name.toLowerCase() === labelName.toLowerCase()
        );

        if (existingLabel) {
          return existingLabel.id;
        }

        // Create new label if it doesn't exist
        const createRes = await oauthAuthenticatedFetch(
          grant,
          "https://gmail.googleapis.com/gmail/v1/users/me/labels",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              name: labelName,
              labelListVisibility: "labelShow",
              messageListVisibility: "show",
            }),
          }
        );

        if (!createRes.ok) {
          throw new Error(`Gmail API rejected label creation with status ${createRes.status}.`);
        }

        const newLabelPayload: unknown = await createRes.json();
        const newLabel = gmailLabelSchema.parse(newLabelPayload);
        return newLabel.id;
      });

      // Add label to message
      const response = await step.run("add-label-to-message", async () => {
        const res = await oauthAuthenticatedFetch(
          grant,
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              addLabelIds: [labelId],
            }),
          }
        );

        if (!res.ok) {
          throw new Error(`Gmail API rejected the label update with status ${res.status}.`);
        }

        const payload: unknown = await res.json();
        return gmailModifyMessageResponseSchema.parse(payload);
      });

      await publish(
        gmailAddLabelChannel().status({ nodeId, status: "success" })
      );

      return {
        ...context,
        ...(data.variableName
          ? {
              [data.variableName]: {
                id: response.id,
                threadId: response.threadId,
                labelIds: response.labelIds,
                addedLabel: labelName,
              },
            }
          : {}),
      };
    } catch (error) {
      await publish(
        gmailAddLabelChannel().status({ nodeId, status: "error" })
      );
      throw error;
    }
  };
