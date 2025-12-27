import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { discordEditMessageChannel } from "@/inngest/channels/discord-edit-message";
import { decode } from "html-entities";

type DiscordEditMessageData = {
  variableName?: string;
  channelId: string;
  messageId: string;
  message: string;
};

export const discordEditMessageExecutor: NodeExecutor<DiscordEditMessageData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(discordEditMessageChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.channelId) {
      await publish(discordEditMessageChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Discord: Edit Message error: channelId is required.");
    }

    if (!data.messageId) {
      await publish(discordEditMessageChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Discord: Edit Message error: messageId is required.");
    }

    if (!data.message) {
      await publish(discordEditMessageChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Discord: Edit Message error: message is required.");
    }

    // Compile fields with Handlebars
    const channelId = data.channelId ? decode(Handlebars.compile(data.channelId)(context)) : undefined;
    const messageId = data.messageId ? decode(Handlebars.compile(data.messageId)(context)) : undefined;
    const message = data.message ? decode(Handlebars.compile(data.message)(context)) : undefined;

    // TODO: Implement Discord: Edit Message logic here
    const result = await step.run("discord-edit-message", async () => {
      // Add implementation here
      throw new NonRetriableError("Discord: Edit Message: Not yet implemented");
    });

    await publish(discordEditMessageChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(discordEditMessageChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
