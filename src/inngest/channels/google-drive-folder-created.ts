import { channel, topic } from "@inngest/realtime";

export const GOOGLE_DRIVE_FOLDER_CREATED_CHANNEL_NAME = "google-drive-folder-created-trigger";

export const googleDriveFolderCreatedChannel = channel(
  GOOGLE_DRIVE_FOLDER_CREATED_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
