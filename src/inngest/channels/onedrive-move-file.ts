import { channel, topic } from "@inngest/realtime";

export const ONEDRIVE_MOVE_FILE_CHANNEL_NAME = "onedrive-move-file-execution";

export const onedriveMoveFileChannel = channel(
  ONEDRIVE_MOVE_FILE_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
