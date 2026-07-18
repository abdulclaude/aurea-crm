import { createStudioTriggerExecutor } from "@/features/nodes/studio/lib/create-studio-trigger-executor";
import { referralConvertedTriggerChannel } from "@/inngest/channels/referral-converted-trigger";

export const referralConvertedTriggerExecutor = createStudioTriggerExecutor({
  channel: referralConvertedTriggerChannel,
  fallbackVariableName: "referral",
});
