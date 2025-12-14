import { channel, topic } from "@inngest/realtime";

export const GOOGLE_DRIVE_DELETE_FILE_CHANNEL_NAME = "google-drive-delete-file";

export const googleDriveDeleteFileChannel = channel(GOOGLE_DRIVE_DELETE_FILE_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
