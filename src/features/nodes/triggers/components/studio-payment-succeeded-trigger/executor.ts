import { createStudioTriggerExecutor } from "@/features/nodes/studio/lib/create-studio-trigger-executor";
import { studioPaymentSucceededTriggerChannel } from "@/inngest/channels/studio-payment-succeeded-trigger";

export const studioPaymentSucceededTriggerExecutor = createStudioTriggerExecutor(
  {
    channel: studioPaymentSucceededTriggerChannel,
    fallbackVariableName: "payment",
  },
);
