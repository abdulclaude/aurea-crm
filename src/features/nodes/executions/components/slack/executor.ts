import Handlebars from "handlebars";

import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";

import { slackChannel } from "@/inngest/channels/slack";

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

type SlackData = {
  variableName?: string;
  webhookId?: string;
  webhookUrl: string;
  content: string;
  username?: string;
};

export const slackExecutor: NodeExecutor<SlackData> = async ({
  data,
  nodeId,
  scope,
  context,
  step,
  publish,
}) => {
  await publish(slackChannel().status({ nodeId, status: "loading" }));

  try {
    if (!data.variableName) {
      await publish(slackChannel().status({ nodeId, status: "error" }));

      throw new NonRetriableError(
        "Slack Node error: No variable name has been set."
      );
    }

    if (!data.content) {
      await publish(slackChannel().status({ nodeId, status: "error" }));

      throw new NonRetriableError(
        "Slack Node error: No message content has been set."
      );
    }

    const resolvedWebhookUrl = await resolveWebhookUrl(data, scope);

    const rawContent = Handlebars.compile(data.content)(context);
    const content = decode(rawContent);

    const username = data.username
      ? decode(Handlebars.compile(data.username)(context))
      : undefined;

    const result = await step.run("slack-webhook", async () => {
      await ky.post(resolvedWebhookUrl, {
        json: {
          content: content,
        },
      });
    });

    await publish(slackChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [data.variableName]: {
        messageContent: content.slice(0, 2000),
      },
    };
  } catch (error) {
    await publish(slackChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

const resolveWebhookUrl = async (
  data: SlackData,
  scope: { organizationId: string; locationId: string | null },
): Promise<string> => {
  if (!data.webhookId) {
    throw new NonRetriableError(
      "Slack Node error: Select a workspace-scoped webhook.",
    );
  }
  const webhook = await db.query.webhook.findFirst({
    where: and(
      eq(webhookTable.id, data.webhookId),
      eq(webhookTable.organizationId, scope.organizationId),
      scope.locationId
        ? eq(webhookTable.locationId, scope.locationId)
        : isNull(webhookTable.locationId),
      eq(webhookTable.provider, "SLACK"),
    ),
  });
  if (!webhook) {
    throw new NonRetriableError(
      "Saved Slack webhook could not be found in this workspace.",
    );
  }
  return decrypt(webhook.url);
};
