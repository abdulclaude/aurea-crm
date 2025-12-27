import Handlebars from "handlebars";
import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { discordSendDmChannel } from "@/inngest/channels/discord-send-dm";
import { decode } from "html-entities";

type DiscordSendDmData = {
  variableName?: string;
  userId: string;
  message: string;
};

export const discordSendDmExecutor: NodeExecutor<DiscordSendDmData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(discordSendDmChannel().status({ nodeId, status: "loading" }));

  try {
    // Validate required fields
    if (!data.userId) {
      await publish(discordSendDmChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Discord: Send DM error: userId is required.");
    }

    if (!data.message) {
      await publish(discordSendDmChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError("Discord: Send DM error: message is required.");
    }

    // Compile fields with Handlebars
    const userId = data.userId ? decode(Handlebars.compile(data.userId)(context)) : undefined;
    const message = data.message ? decode(Handlebars.compile(data.message)(context)) : undefined;

    // TODO: Implement Discord: Send DM logic here
    const result = await step.run("discord-send-dm", async () => {
      // Add implementation here
      throw new NonRetriableError("Discord: Send DM: Not yet implemented");
    });

    await publish(discordSendDmChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      ...(data.variableName
        ? {
            [data.variableName]: result,
          }
        : {}),
    };
  } catch (error) {
    await publish(discordSendDmChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
