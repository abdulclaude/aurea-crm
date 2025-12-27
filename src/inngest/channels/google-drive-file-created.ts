import { channel, topic } from "@inngest/realtime";

export const GOOGLE_DRIVE_FILE_CREATED_CHANNEL_NAME = "google-drive-file-created-trigger";

export const googleDriveFileCreatedChannel = channel(
  GOOGLE_DRIVE_FILE_CREATED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
