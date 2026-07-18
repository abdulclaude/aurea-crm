import { createStudioTriggerExecutor } from "@/features/nodes/studio/lib/create-studio-trigger-executor";
import { clientInactivityTriggerChannel } from "@/inngest/channels/client-inactivity-trigger";

export const clientInactivityTriggerExecutor = createStudioTriggerExecutor({
  channel: clientInactivityTriggerChannel,
  fallbackVariableName: "inactivity",
});
