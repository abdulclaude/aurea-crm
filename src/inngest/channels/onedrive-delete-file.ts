import { channel, topic } from "@inngest/realtime";

export const ONEDRIVE_DELETE_FILE_CHANNEL_NAME = "onedrive-delete-file-execution";

export const onedriveDeleteFileChannel = channel(
  ONEDRIVE_DELETE_FILE_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
