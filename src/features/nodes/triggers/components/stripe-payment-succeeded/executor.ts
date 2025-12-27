import type { NodeExecutor } from "@/features/executions/types";
import { stripePaymentSucceededChannel } from "@/inngest/channels/stripe-payment-succeeded";

export interface StripePaymentSucceededConfig {
  variableName?: string;
}

export const stripePaymentSucceededExecutor: NodeExecutor<StripePaymentSucceededConfig> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(stripePaymentSucceededChannel().status({ nodeId, status: "loading" }));

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The trigger data will be passed in through the context
    // This is a passive trigger node

    await publish(stripePaymentSucceededChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(stripePaymentSucceededChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "payment";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
