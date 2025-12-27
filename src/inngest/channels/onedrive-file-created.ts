import { channel, topic } from "@inngest/realtime";

export const ONEDRIVE_FILE_CREATED_CHANNEL_NAME = "onedrive-file-created-trigger";

export const onedriveFileCreatedChannel = channel(
  ONEDRIVE_FILE_CREATED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
