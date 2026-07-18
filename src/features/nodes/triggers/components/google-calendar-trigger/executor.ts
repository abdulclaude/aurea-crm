import { NodeType } from "@/db/enums";
import type { NodeExecutor } from "@/features/executions/types";
import { resolveOAuthProviderGrant } from "@/features/provider-accounts/server/oauth-resolver";
import { getWorkflowProviderBindingSpec } from "@/features/workflows/lib/workflow-provider-binding";
import { googleCalendarTriggerChannel } from "@/inngest/channels/google-calendar-trigger";
import { NonRetriableError } from "inngest";

type GoogleCalendarTriggerData = Record<string, unknown> & {
  providerAccountId: string;
};

const providerBinding = getWorkflowProviderBindingSpec(
  NodeType.GOOGLE_CALENDAR_TRIGGER,
);

export const googleCalendarTriggerExecutor: NodeExecutor<
  GoogleCalendarTriggerData
> = async ({ data, nodeId, scope, context, step, publish }) => {
  await publish(
    googleCalendarTriggerChannel().status({ nodeId, status: "loading" })
  );

  if (!data.providerAccountId) {
    await publish(
      googleCalendarTriggerChannel().status({ nodeId, status: "error" }),
    );
    throw new NonRetriableError("Select a Google Calendar account.");
  }

  await step.run("validate-google-calendar-trigger-account", async () =>
    resolveOAuthProviderGrant({
      providerAccountId: data.providerAccountId,
      provider: providerBinding.provider,
      scope,
      requiredScopes: providerBinding.requiredScopes,
    }),
  );

  const result = await step.run("google-calendar-trigger", async () => context);

  await publish(
    googleCalendarTriggerChannel().status({ nodeId, status: "success" })
  );

  return result;
};
