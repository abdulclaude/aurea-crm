import { channel, topic } from "@inngest/realtime";

export const ONEDRIVE_CHANNEL_NAME = "onedrive-execution";

export const oneDriveChannel = channel(ONEDRIVE_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
