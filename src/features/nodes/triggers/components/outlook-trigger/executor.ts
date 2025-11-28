import type { NodeExecutor } from "@/features/executions/types";
import { outlookTriggerChannel } from "@/inngest/channels/outlook-trigger";
import { auth } from "@/lib/auth";
import { NonRetriableError } from "inngest";
import type { OutlookTriggerConfig } from "@/features/outlook/server/subscriptions";

export const outlookTriggerExecutor: NodeExecutor<OutlookTriggerConfig> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(outlookTriggerChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    const tokenResponse = await auth.api.getAccessToken({
      body: {
        providerId: "microsoft",
        userId,
      },
    });

    const accessToken = tokenResponse?.accessToken;
    if (!accessToken) {
      throw new NonRetriableError(
        "Outlook is not connected. Please connect Microsoft 365."
      );
    }

    const folder = data?.folderName || "Inbox";
    const messages = await step.run("outlook-fetch-messages", async () => {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/mailFolders/${folder}/messages?$top=10&$orderby=receivedDateTime desc`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new NonRetriableError("Failed to fetch Outlook messages.");
      }

      const data = await response.json();
      return data.value;
    });

    // Filter by subject and sender if provided
    let filteredMessages = messages;
    if (data?.subject) {
      filteredMessages = filteredMessages.filter((msg: { subject: string }) =>
        msg.subject?.includes(data.subject!)
      );
    }
    if (data?.sender) {
      filteredMessages = filteredMessages.filter(
        (msg: { from: { emailAddress: { address: string } } }) =>
          msg.from?.emailAddress?.address?.includes(data.sender!)
      );
    }

    const payload = {
      messages: filteredMessages,
      count: filteredMessages.length,
    };

    await publish(outlookTriggerChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: payload,
    };
  } catch (error) {
    await publish(outlookTriggerChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "outlookTrigger";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
