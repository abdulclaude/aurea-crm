import { createStudioTriggerExecutor } from "@/features/nodes/studio/lib/create-studio-trigger-executor";
import { introOfferCompletedTriggerChannel } from "@/inngest/channels/intro-offer-completed-trigger";

export const introOfferCompletedTriggerExecutor = createStudioTriggerExecutor({
  channel: introOfferCompletedTriggerChannel,
  fallbackVariableName: "introOffer",
});
