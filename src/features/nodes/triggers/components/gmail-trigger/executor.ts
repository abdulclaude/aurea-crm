import { NodeType } from "@/db/enums";
import type { NodeExecutor } from "@/features/executions/types";
import {
  fetchGmailMessages,
  type GmailTriggerConfig,
} from "@/features/gmail/server/messages";
import { resolveGoogleMailProviderGrant } from "@/features/nodes/lib/resolve-google-mail-provider-grant";
import { gmailTriggerChannel } from "@/inngest/channels/gmail-trigger";

type BoundGmailTriggerConfig = GmailTriggerConfig & {
  providerAccountId?: string;
};

export const gmailTriggerExecutor: NodeExecutor<BoundGmailTriggerConfig> =
  async ({ data, nodeId, scope, context, step, publish }) => {
    await publish(gmailTriggerChannel().status({ nodeId, status: "loading" }));

    try {
      const variableName = normalizeVariableName(data?.variableName);

      const grant = await resolveGoogleMailProviderGrant({
        nodeType: NodeType.GMAIL_TRIGGER,
        providerAccountId: data.providerAccountId,
        scope,
      });

      const payload = await step.run("gmail-fetch-messages", async () =>
        fetchGmailMessages({
          grant,
          config: {
            variableName,
            labelId: data?.labelId,
            query: data?.query,
            includeSpamTrash: data?.includeSpamTrash,
            maxResults: data?.maxResults,
          },
        }),
      );

      await publish(
        gmailTriggerChannel().status({ nodeId, status: "success" }),
      );

      return {
        ...context,
        [variableName]: payload,
      };
    } catch (error) {
      await publish(gmailTriggerChannel().status({ nodeId, status: "error" }));
      throw error;
    }
  };

function normalizeVariableName(value?: string | null) {
  const fallback = "gmailTrigger";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
