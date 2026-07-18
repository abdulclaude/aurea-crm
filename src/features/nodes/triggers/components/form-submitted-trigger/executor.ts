import { createStudioTriggerExecutor } from "@/features/nodes/studio/lib/create-studio-trigger-executor";
import { formSubmittedTriggerChannel } from "@/inngest/channels/form-submitted-trigger";

export const formSubmittedTriggerExecutor = createStudioTriggerExecutor({
  channel: formSubmittedTriggerChannel,
  fallbackVariableName: "formSubmission",
});
