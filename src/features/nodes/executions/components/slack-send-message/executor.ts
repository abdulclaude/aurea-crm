import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { slackSendMessageChannel } from "@/inngest/channels/slack-send-message";
import { auth } from "@/lib/auth";
import { decode } from "html-entities";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type SlackSendMessageData = {
  variableName?: string;
  channelId: string;
  message: string;
};

export const slackSendMessageExecutor: NodeExecutor<SlackSendMessageData> =
  async ({ data, nodeId, userId, context, step, publish }) => {
    await publish(
      slackSendMessageChannel().status({ nodeId, status: "loading" })
    );

    try {
      if (!data.channelId) {
        await publish(
          slackSendMessageChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Slack Send Message: Channel ID is required."
        );
      }

      if (!data.message) {
        await publish(
          slackSendMessageChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Slack Send Message: Message content is required."
        );
      }

      // Get Slack OAuth token
      const tokenResponse = await step.run("get-slack-token", async () => {
        return await auth.api.getAccessToken({
          body: {
            providerId: "slack",
            userId,
          },
        });
      });

      const accessToken = tokenResponse?.accessToken;

      if (!accessToken) {
        await publish(
          slackSendMessageChannel().status({ nodeId, status: "error" })
        );
        throw new NonRetriableError(
          "Slack is not connected. Please connect Slack in Settings → Apps."
        );
      }

      // Compile templates
      const channelId = decode(Handlebars.compile(data.channelId)(context));
      const message = decode(Handlebars.compile(data.message)(context));

      // Send message via Slack API
      const response = await step.run("send-slack-message", async () => {
        const res = await fetch("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            channel: channelId,
            text: message,
          }),
        });

        const json = await res.json();

        if (!json.ok) {
          throw new Error(
            `Slack API error: ${json.error || "Unknown error"}`
          );
        }

        return json;
      });

      await publish(
        slackSendMessageChannel().status({ nodeId, status: "success" })
      );

      return {
        ...context,
        ...(data.variableName
          ? {
              [data.variableName]: {
                ok: response.ok,
                channel: response.channel,
                ts: response.ts,
                message: response.message,
              },
            }
          : {}),
      };
    } catch (error) {
      await publish(
        slackSendMessageChannel().status({ nodeId, status: "error" })
      );
      throw error;
    }
  };
