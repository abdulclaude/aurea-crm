import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { slackSendDmChannel } from "@/inngest/channels/slack-send-dm";
import { decode } from "html-entities";

type SlackSendDmData = {
  variableName?: string;
  userId: string;
  message: string;
};

export const slackSendDmExecutor: NodeExecutor<SlackSendDmData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(slackSendDmChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.userId) {
      await publish(slackSendDmChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Slack: Send DM error: userId is required.");
    }

    if (!data.message) {
      await publish(slackSendDmChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Slack: Send DM error: message is required.");
    }

    // Compile fields with Handlebars
    const userId = data.userId ? decode(Handlebars.compile(data.userId)(context)) : undefined;
    const message = data.message ? decode(Handlebars.compile(data.message)(context)) : undefined;

    // TODO: Implement Slack: Send DM logic here
    const result = await step.run("slack-send-dm", async () => {
      // Add implementation here
      throw new NonRetriableError("Slack: Send DM: Not yet implemented");
    });

    await publish(slackSendDmChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(slackSendDmChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
