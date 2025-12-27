import type { NodeExecutor } from "@/features/executions/types";
import { stripeSubscriptionCreatedChannel } from "@/inngest/channels/stripe-subscription-created";

export interface StripeSubscriptionCreatedConfig {
  variableName?: string;
}

export const stripeSubscriptionCreatedExecutor: NodeExecutor<StripeSubscriptionCreatedConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(stripeSubscriptionCreatedChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(stripeSubscriptionCreatedChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(stripeSubscriptionCreatedChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "subscription";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
