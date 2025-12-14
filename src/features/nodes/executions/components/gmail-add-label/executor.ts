import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { gmailAddLabelChannel } from "@/inngest/channels/gmail-add-label";
import { auth } from "@/lib/auth";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GmailAddLabelData = {
  variableName?: string;
  messageId: string;
  labelName: string;
};

export const gmailAddLabelExecutor: NodeExecutor<GmailAddLabelData> =
  async ({ data, nodeId, userId, context, step, publish }) => {
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
          gmailAddLabelChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Gmail is not connected. Please connect Gmail in Settings → Apps."
        );
      }

      // Compile templates
      const messageId = decode(Handlebars.compile(data.messageId)(context));
      const labelName = decode(Handlebars.compile(data.labelName)(context));

      // Get or create label
      const labelId = await step.run("get-or-create-label", async () => {
        // First, try to find existing label
        const listRes = await fetch(
          "https://gmail.googleapis.com/gmail/v1/users/me/labels",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!listRes.ok) {
          const error = await listRes.text();
          throw new Error(`Gmail API error: ${error}`);
        }

        const labelsData = await listRes.json();
        const existingLabel = labelsData.labels?.find(
          (l: any) => l.name.toLowerCase() === labelName.toLowerCase()
        );

        if (existingLabel) {
          return existingLabel.id;
        }

        // Create new label if it doesn't exist
        const createRes = await fetch(
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
          const error = await createRes.text();
          throw new Error(`Gmail API error creating label: ${error}`);
        }

        const newLabel = await createRes.json();
        return newLabel.id;
      });

      // Add label to message
      const response = await step.run("add-label-to-message", async () => {
        const res = await fetch(
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
          const error = await res.text();
          throw new Error(`Gmail API error: ${error}`);
        }

        return await res.json();
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
