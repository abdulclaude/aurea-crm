import type { NodeExecutor } from "@/features/executions/types";
import { gmailTriggerChannel } from "@/inngest/channels/gmail-trigger";
import { auth } from "@/lib/auth";
import { NonRetriableError } from "inngest";
import {
  fetchGmailMessages,
  type GmailTriggerConfig,
} from "@/features/gmail/server/messages";

export const gmailTriggerExecutor: NodeExecutor<GmailTriggerConfig> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(gmailTriggerChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

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

    const payload = await step.run("gmail-fetch-messages", async () =>
      fetchGmailMessages({
        accessToken,
        config: {
          variableName,
          labelId: data?.labelId,
          query: data?.query,
          includeSpamTrash: data?.includeSpamTrash,
          maxResults: data?.maxResults,
        },
      })
    );

    await publish(gmailTriggerChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: payload,
    };
  } catch (error) {
    await publish(gmailTriggerChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "gmailTrigger";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
