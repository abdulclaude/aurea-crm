import { channel, topic } from "@inngest/realtime";

export const CREATE_TASK_CHANNEL_NAME = "create-task-execution";

export const createTaskChannel = channel(CREATE_TASK_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
