import { channel, topic } from "@inngest/realtime";

export const GOOGLE_DRIVE_UPLOAD_FILE_CHANNEL_NAME = "google-drive-upload-file";

export const googleDriveUploadFileChannel = channel(GOOGLE_DRIVE_UPLOAD_FILE_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
