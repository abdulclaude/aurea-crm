import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { discordSendMessageChannel } from "@/inngest/channels/discord-send-message";
import { decode } from "html-entities";

type DiscordSendMessageData = {
  variableName?: string;
  channelId: string;
  message: string;
};

export const discordSendMessageExecutor: NodeExecutor<DiscordSendMessageData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(discordSendMessageChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.channelId) {
      await publish(discordSendMessageChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Discord: Send Message error: channelId is required.");
    }

    if (!data.message) {
      await publish(discordSendMessageChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Discord: Send Message error: message is required.");
    }

    // Compile fields with Handlebars
    const channelId = data.channelId ? decode(Handlebars.compile(data.channelId)(context)) : undefined;
    const message = data.message ? decode(Handlebars.compile(data.message)(context)) : undefined;

    // TODO: Implement Discord: Send Message logic here
    const result = await step.run("discord-send-message", async () => {
      // Add implementation here
      throw new NonRetriableError("Discord: Send Message: Not yet implemented");
    });

    await publish(discordSendMessageChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(discordSendMessageChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
