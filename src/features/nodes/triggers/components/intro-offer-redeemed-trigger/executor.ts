import type { NodeExecutor } from "@/features/executions/types";
import { introOfferRedeemedTriggerChannel } from "@/inngest/channels/intro-offer-redeemed-trigger";

export interface IntroOfferRedeemedTriggerConfig {
  variableName?: string;
}

export const introOfferRedeemedTriggerExecutor: NodeExecutor<
  IntroOfferRedeemedTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    introOfferRedeemedTriggerChannel().status({ nodeId, status: "loading" })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    await publish(
      introOfferRedeemedTriggerChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      introOfferRedeemedTriggerChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "redeemedOffer";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
