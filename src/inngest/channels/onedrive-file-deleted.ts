import { channel, topic } from "@inngest/realtime";

export const ONEDRIVE_FILE_DELETED_CHANNEL_NAME = "onedrive-file-deleted-trigger";

export const onedriveFileDeletedChannel = channel(
  ONEDRIVE_FILE_DELETED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
