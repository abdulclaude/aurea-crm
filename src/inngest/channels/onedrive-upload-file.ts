import { channel, topic } from "@inngest/realtime";

export const ONEDRIVE_UPLOAD_FILE_CHANNEL_NAME = "onedrive-upload-file-execution";

export const onedriveUploadFileChannel = channel(
  ONEDRIVE_UPLOAD_FILE_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
