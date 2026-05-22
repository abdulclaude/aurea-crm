import { createStudioTriggerExecutor } from "@/features/nodes/studio/lib/create-studio-trigger-executor";
import { clientTagRemovedTriggerChannel } from "@/inngest/channels/client-tag-removed-trigger";

export const clientTagRemovedTriggerExecutor = createStudioTriggerExecutor({
  channel: clientTagRemovedTriggerChannel,
  fallbackVariableName: "tagChange",
});
