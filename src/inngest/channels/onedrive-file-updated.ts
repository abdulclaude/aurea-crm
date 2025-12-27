import { channel, topic } from "@inngest/realtime";

export const ONEDRIVE_FILE_UPDATED_CHANNEL_NAME = "onedrive-file-updated-trigger";

export const onedriveFileUpdatedChannel = channel(
  ONEDRIVE_FILE_UPDATED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
