import { channel, topic } from "@inngest/realtime";

export const ADD_DEAL_NOTE_CHANNEL_NAME = "add-deal-note-execution";

export const addDealNoteChannel = channel(
  ADD_DEAL_NOTE_CHANNEL_NAME
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
