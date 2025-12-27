import type { NodeExecutor } from "@/features/executions/types";
import { stripePaymentFailedChannel } from "@/inngest/channels/stripe-payment-failed";

export interface StripePaymentFailedConfig {
  variableName?: string;
}

export const stripePaymentFailedExecutor: NodeExecutor<StripePaymentFailedConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(stripePaymentFailedChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(stripePaymentFailedChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(stripePaymentFailedChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "failedPayment";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
