import { NonRetriableError } from "inngest";

import { NodeType } from "@/db/enums";
import type { NodeExecutor } from "@/features/executions/types";
import { resolveOutlookTriggerSender } from "@/features/outlook/lib/trigger-config";
import { resolveOAuthProviderGrant } from "@/features/provider-accounts/server/oauth-resolver";
import { oauthAuthenticatedFetch } from "@/features/provider-accounts/server/oauth-authenticated-fetch";
import { getWorkflowProviderBindingSpec } from "@/features/workflows/lib/workflow-provider-binding";
import { outlookTriggerChannel } from "@/inngest/channels/outlook-trigger";

type ScopedOutlookTriggerConfig = {
  providerAccountId?: string;
  variableName?: string;
  folderName?: string;
  subject?: string;
  sender?: string;
  from?: string;
};

const providerBinding = getWorkflowProviderBindingSpec(
  NodeType.OUTLOOK_TRIGGER,
);

export const outlookTriggerExecutor: NodeExecutor<
  ScopedOutlookTriggerConfig
> = async ({ data, nodeId, scope, context, step, publish }) => {
  await publish(outlookTriggerChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    if (!data.providerAccountId) {
      throw new NonRetriableError(
        "Select an Outlook account for this trigger.",
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

    const messages = await step.run("outlook-fetch-messages", async () => {
      const response = await oauthAuthenticatedFetch(
        grant,
        "https://graph.microsoft.com/v1.0/me/mailFolders/Inbox/messages?$top=10&$orderby=receivedDateTime desc",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new NonRetriableError("Failed to fetch Outlook messages.");
      }

      const data = await response.json();
      return data.value;
    });

    // Filter by subject and sender if provided
    let filteredMessages = messages;
    const subject = data?.subject;
    if (subject) {
      filteredMessages = filteredMessages.filter((msg: { subject: string }) =>
        msg.subject?.includes(subject),
      );
    }
    const sender = resolveOutlookTriggerSender(data);
    if (sender) {
      filteredMessages = filteredMessages.filter(
        (msg: { from: { emailAddress: { address: string } } }) =>
          msg.from?.emailAddress?.address?.includes(sender),
      );
    }

    const payload = {
      messages: filteredMessages,
      count: filteredMessages.length,
    };

    await publish(
      outlookTriggerChannel().status({ nodeId, status: "success" }),
    );

    return {
      ...context,
      [variableName]: payload,
    };
  } catch (error) {
    await publish(outlookTriggerChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "outlookTrigger";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
