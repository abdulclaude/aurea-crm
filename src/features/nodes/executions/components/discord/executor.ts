import Handlebars from "handlebars";

import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";

import { discordChannel } from "@/inngest/channels/discord";

import { decode } from "html-entities";
import ky from "ky";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { webhook as webhookTable } from "@/db/schema";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type DiscordData = {
  variableName?: string;
  webhookId?: string;
  webhookUrl: string;
  content: string;
  username?: string;
};

export const discordExecutor: NodeExecutor<DiscordData> = async ({
  data,
  nodeId,
  scope,
  context,
  step,
  publish,
}) => {
  await publish(discordChannel().status({ nodeId, status: "loading" }));

  try {
    if (!data.variableName) {
      await publish(discordChannel().status({ nodeId, status: "error" }));

      throw new NonRetriableError(
        "Discord Node error: No variable name has been set."
      );
    }

    if (!data.content) {
      await publish(discordChannel().status({ nodeId, status: "error" }));

      throw new NonRetriableError(
        "Discord Node error: No message content has been set."
      );
    }

    const resolvedWebhookUrl = await resolveWebhookUrl(data, scope);

    const rawContent = Handlebars.compile(data.content)(context);
    const content = decode(rawContent);

    const username = data.username
      ? decode(Handlebars.compile(data.username)(context))
      : undefined;

    const result = await step.run("discord-webhook", async () => {
      await ky.post(resolvedWebhookUrl, {
        json: {
          content: content.slice(0, 2000), // discord max message length
          username,
        },
      });
    });

    await publish(discordChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [data.variableName]: {
        messageContent: content.slice(0, 2000),
      },
    };
  } catch (error) {
    await publish(discordChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

const resolveWebhookUrl = async (
  data: DiscordData,
  scope: { organizationId: string; locationId: string | null },
): Promise<string> => {
  if (!data.webhookId) {
    throw new NonRetriableError(
      "Discord Node error: Select a workspace-scoped webhook.",
    );
  }
  const webhook = await db.query.webhook.findFirst({
    where: and(
      eq(webhookTable.id, data.webhookId),
      eq(webhookTable.organizationId, scope.organizationId),
      scope.locationId
        ? eq(webhookTable.locationId, scope.locationId)
        : isNull(webhookTable.locationId),
      eq(webhookTable.provider, "DISCORD"),
    ),
  });
  if (!webhook) {
    throw new NonRetriableError(
      "Saved Discord webhook could not be found in this workspace.",
    );
  }
  return decrypt(webhook.url);
};
