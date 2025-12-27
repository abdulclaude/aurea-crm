import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { slackUpdateMessageChannel } from "@/inngest/channels/slack-update-message";
import { decode } from "html-entities";

type SlackUpdateMessageData = {
  variableName?: string;
  channel: string;
  timestamp: string;
  message: string;
};

export const slackUpdateMessageExecutor: NodeExecutor<SlackUpdateMessageData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(slackUpdateMessageChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.channel) {
      await publish(slackUpdateMessageChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Slack: Update Message error: channel is required.");
    }

    if (!data.timestamp) {
      await publish(slackUpdateMessageChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Slack: Update Message error: timestamp is required.");
    }

    if (!data.message) {
      await publish(slackUpdateMessageChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Slack: Update Message error: message is required.");
    }

    // Compile fields with Handlebars
    const channel = data.channel ? decode(Handlebars.compile(data.channel)(context)) : undefined;
    const timestamp = data.timestamp ? decode(Handlebars.compile(data.timestamp)(context)) : undefined;
    const message = data.message ? decode(Handlebars.compile(data.message)(context)) : undefined;

    // TODO: Implement Slack: Update Message logic here
    const result = await step.run("slack-update-message", async () => {
      // Add implementation here
      throw new NonRetriableError("Slack: Update Message: Not yet implemented");
    });

    await publish(slackUpdateMessageChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(slackUpdateMessageChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
