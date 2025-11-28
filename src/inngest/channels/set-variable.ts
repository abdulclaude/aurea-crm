import { channel, topic } from "@inngest/realtime";

export const SET_VARIABLE_CHANNEL_NAME = "set-variable-execution";

export const setVariableChannel = channel(SET_VARIABLE_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
