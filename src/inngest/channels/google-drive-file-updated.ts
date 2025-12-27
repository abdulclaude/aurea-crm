import { channel, topic } from "@inngest/realtime";

export const GOOGLE_DRIVE_FILE_UPDATED_CHANNEL_NAME = "google-drive-file-updated-trigger";

export const googleDriveFileUpdatedChannel = channel(
  GOOGLE_DRIVE_FILE_UPDATED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
