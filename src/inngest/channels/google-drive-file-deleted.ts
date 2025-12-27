import { channel, topic } from "@inngest/realtime";

export const GOOGLE_DRIVE_FILE_DELETED_CHANNEL_NAME = "google-drive-file-deleted-trigger";

export const googleDriveFileDeletedChannel = channel(
  GOOGLE_DRIVE_FILE_DELETED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
