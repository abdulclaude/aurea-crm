import { channel, topic } from "@inngest/realtime";

export const GOOGLE_DRIVE_CREATE_FOLDER_CHANNEL_NAME = "google-drive-create-folder";

export const googleDriveCreateFolderChannel = channel(GOOGLE_DRIVE_CREATE_FOLDER_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
