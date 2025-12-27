import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { discordSendEmbedChannel } from "@/inngest/channels/discord-send-embed";
import { decode } from "html-entities";

type DiscordSendEmbedData = {
  variableName?: string;
  channelId: string;
  title: string;
  description: string;
};

export const discordSendEmbedExecutor: NodeExecutor<DiscordSendEmbedData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(discordSendEmbedChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.channelId) {
      await publish(discordSendEmbedChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Discord: Send Embed error: channelId is required.");
    }

    if (!data.title) {
      await publish(discordSendEmbedChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Discord: Send Embed error: title is required.");
    }

    if (!data.description) {
      await publish(discordSendEmbedChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Discord: Send Embed error: description is required.");
    }

    // Compile fields with Handlebars
    const channelId = data.channelId ? decode(Handlebars.compile(data.channelId)(context)) : undefined;
    const title = data.title ? decode(Handlebars.compile(data.title)(context)) : undefined;
    const description = data.description ? decode(Handlebars.compile(data.description)(context)) : undefined;

    // TODO: Implement Discord: Send Embed logic here
    const result = await step.run("discord-send-embed", async () => {
      // Add implementation here
      throw new NonRetriableError("Discord: Send Embed: Not yet implemented");
    });

    await publish(discordSendEmbedChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(discordSendEmbedChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
