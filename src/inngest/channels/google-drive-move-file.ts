import { channel, topic } from "@inngest/realtime";

export const GOOGLE_DRIVE_MOVE_FILE_CHANNEL_NAME = "google-drive-move-file";

export const googleDriveMoveFileChannel = channel(GOOGLE_DRIVE_MOVE_FILE_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
