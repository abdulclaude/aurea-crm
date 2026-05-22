import { createStudioTriggerExecutor } from "@/features/nodes/studio/lib/create-studio-trigger-executor";
import { studioPaymentFailedTriggerChannel } from "@/inngest/channels/studio-payment-failed-trigger";

export const studioPaymentFailedTriggerExecutor = createStudioTriggerExecutor({
  channel: studioPaymentFailedTriggerChannel,
  fallbackVariableName: "payment",
});
