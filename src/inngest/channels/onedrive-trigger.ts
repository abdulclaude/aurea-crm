import { channel, topic } from "@inngest/realtime";

export const ONEDRIVE_TRIGGER_CHANNEL_NAME = "onedrive-trigger";

export const oneDriveTriggerChannel = channel(ONEDRIVE_TRIGGER_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
