import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import { decode } from "html-entities";

import { NodeType } from "@/db/enums";
import type { NodeExecutor } from "@/features/executions/types";
import { resolveOAuthProviderGrant } from "@/features/provider-accounts/server/oauth-resolver";
import {
  oauthAuthenticatedFetch,
  recordOAuthProviderAuthenticationFailure,
} from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import { getWorkflowProviderBindingSpec } from "@/features/workflows/lib/workflow-provider-binding";
import { slackSendMessageChannel } from "@/inngest/channels/slack-send-message";
import { z } from "zod";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type SlackSendMessageData = {
  providerAccountId?: string;
  variableName?: string;
  channelId: string;
  message: string;
};

const providerBinding = getWorkflowProviderBindingSpec(
  NodeType.SLACK_SEND_MESSAGE,
);

const slackMessageResponseSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  channel: z.string().optional(),
  ts: z.string().optional(),
  message: z.unknown().optional(),
});

const SLACK_AUTH_ERRORS = new Set([
  "account_inactive",
  "invalid_auth",
  "not_authed",
  "token_expired",
  "token_revoked",
]);

export const slackSendMessageExecutor: NodeExecutor<
  SlackSendMessageData
> = async ({ data, nodeId, scope, context, step, publish }) => {
  await publish(
    slackSendMessageChannel().status({ nodeId, status: "loading" }),
  );

  try {
    if (!data.providerAccountId) {
      throw new NonRetriableError("Select a Slack account for this node.");
    }

    if (!data.channelId) {
      await publish(
        slackSendMessageChannel().status({ nodeId, status: "error" }),
      );
      throw new NonRetriableError(
        "Slack Send Message: Channel ID is required.",
      );
    }

    if (!data.message) {
      await publish(
        slackSendMessageChannel().status({ nodeId, status: "error" }),
      );
      throw new NonRetriableError(
        "Slack Send Message: Message content is required.",
      );
    }

    const grant = await resolveOAuthProviderGrant({
      providerAccountId: data.providerAccountId,
      provider: providerBinding.provider,
      scope: {
        organizationId: scope.organizationId,
        locationId: scope.locationId,
      },
      requiredScopes: providerBinding.requiredScopes,
    });
    const { accessToken } = grant;

    // Compile templates
    const channelId = decode(Handlebars.compile(data.channelId)(context));
    const message = decode(Handlebars.compile(data.message)(context));

    // Send message via Slack API
    const response = await step.run("send-slack-message", async () => {
      const res = await oauthAuthenticatedFetch(grant, "https://slack.com/api/chat.postMessage", {
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

      const json = slackMessageResponseSchema.parse(await res.json());

      if (!json.ok) {
        if (json.error && SLACK_AUTH_ERRORS.has(json.error)) {
          await recordOAuthProviderAuthenticationFailure(grant);
        }
        throw new Error("Slack rejected the message request.");
      }

      return json;
    });

    await publish(
      slackSendMessageChannel().status({ nodeId, status: "success" }),
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
      slackSendMessageChannel().status({ nodeId, status: "error" }),
    );
    throw error;
  }
};
