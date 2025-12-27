import { channel, topic } from "@inngest/realtime";

export const SLACK_UPLOAD_FILE_CHANNEL_NAME = "slack-upload-file-execution";

export const slackUploadFileChannel = channel(
  SLACK_UPLOAD_FILE_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
