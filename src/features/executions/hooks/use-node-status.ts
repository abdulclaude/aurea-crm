import type { Realtime } from "@inngest/realtime";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { useEffect, useState } from "react";
import type { NodeStatus } from "@/components/react-flow/node-status-indicator";

interface UseNodeStatusOptions<TToken extends Realtime.Subscribe.Token> {
  nodeId: string;
  channel: string;
  topic: string;
  refreshToken: () => Promise<TToken>;
}

function getCreatedAtTimestamp(message: unknown): number {
  if (
    typeof message !== "object" ||
    message === null ||
    !("createdAt" in message)
  ) {
    return 0;
  }

  const { createdAt } = message;
  if (createdAt instanceof Date) {
    return createdAt.getTime();
  }

  if (typeof createdAt === "string" || typeof createdAt === "number") {
    return new Date(createdAt).getTime();
  }

  return 0;
}

export function useNodeStatus<TToken extends Realtime.Subscribe.Token>({
  nodeId,
  channel,
  topic,
  refreshToken,
}: UseNodeStatusOptions<TToken>): NodeStatus {
  const [status, setStatus] = useState<NodeStatus>("initial");

  const { data } = useInngestSubscription({
    refreshToken,
    enabled: true,
  });

  useEffect(() => {
    if (!data?.length) {
      return;
    }

    // find the latest message for this node

    const latestMessage = data
      .filter(
        (msg) =>
          msg.kind === "data" &&
          msg.channel === channel &&
          msg.topic === topic &&
          msg.data.nodeId === nodeId
      )
      .sort(
        (a, b) => getCreatedAtTimestamp(b) - getCreatedAtTimestamp(a)
      )[0];

    if (latestMessage?.kind === "data") {
      setStatus(latestMessage.data.status as NodeStatus);
    }
  }, [data, channel, nodeId, topic]);

  return status;
}
