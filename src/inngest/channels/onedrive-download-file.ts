import { channel, topic } from "@inngest/realtime";

export const ONEDRIVE_DOWNLOAD_FILE_CHANNEL_NAME = "onedrive-download-file-execution";

export const onedriveDownloadFileChannel = channel(
  ONEDRIVE_DOWNLOAD_FILE_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
