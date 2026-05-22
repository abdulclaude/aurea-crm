import { createStudioTriggerExecutor } from "@/features/nodes/studio/lib/create-studio-trigger-executor";
import { clientTagAddedTriggerChannel } from "@/inngest/channels/client-tag-added-trigger";

export const clientTagAddedTriggerExecutor = createStudioTriggerExecutor({
  channel: clientTagAddedTriggerChannel,
  fallbackVariableName: "tagChange",
});
