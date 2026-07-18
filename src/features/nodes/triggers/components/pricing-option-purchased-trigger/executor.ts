import { createStudioTriggerExecutor } from "@/features/nodes/studio/lib/create-studio-trigger-executor";
import { pricingOptionPurchasedTriggerChannel } from "@/inngest/channels/pricing-option-purchased-trigger";

export const pricingOptionPurchasedTriggerExecutor =
  createStudioTriggerExecutor({
    channel: pricingOptionPurchasedTriggerChannel,
    fallbackVariableName: "purchase",
  });
