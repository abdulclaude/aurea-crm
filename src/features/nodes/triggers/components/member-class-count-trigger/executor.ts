import { createStudioTriggerExecutor } from "@/features/nodes/studio/lib/create-studio-trigger-executor";
import { memberClassCountTriggerChannel } from "@/inngest/channels/member-class-count-trigger";

export const memberClassCountTriggerExecutor = createStudioTriggerExecutor({
  channel: memberClassCountTriggerChannel,
  fallbackVariableName: "milestone",
});
