import { channel, topic } from "@inngest/realtime";

export const GOOGLE_DRIVE_DOWNLOAD_FILE_CHANNEL_NAME = "google-drive-download-file";

export const googleDriveDownloadFileChannel = channel(GOOGLE_DRIVE_DOWNLOAD_FILE_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
