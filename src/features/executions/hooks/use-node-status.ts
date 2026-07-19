import type { Realtime } from "@inngest/realtime";
import {
  InngestSubscriptionState,
  useInngestSubscription,
} from "@inngest/realtime/hooks";
import { useEffect, useState } from "react";
import type { NodeStatus } from "@/components/react-flow/node-status-indicator";
import { useWorkflowRealtime } from "@/features/editor/store/workflow-realtime-context";

interface UseNodeStatusOptions<TToken extends Realtime.Subscribe.Token> {
  nodeId: string;
  channel: string;
  topic: string;
  refreshToken: () => Promise<TToken>;
}

function isNodeStatus(value: unknown): value is NodeStatus {
  return (
    value === "initial" ||
    value === "loading" ||
    value === "success" ||
    value === "error"
  );
}

export function useNodeStatus<TToken extends Realtime.Subscribe.Token>({
  nodeId,
  channel,
  topic,
  refreshToken,
}: UseNodeStatusOptions<TToken>): NodeStatus {
  const [status, setStatus] = useState<NodeStatus>("initial");
  const [token, setToken] = useState<TToken | null>(null);
  const {
    enabled,
    registerSubscription,
    reportSubscriptionReady,
  } = useWorkflowRealtime();
  const subscriptionKey = `${channel}:${nodeId}`;

  useEffect(
    () => registerSubscription(subscriptionKey),
    [registerSubscription, subscriptionKey],
  );

  useEffect(() => {
    if (!enabled) {
      setToken(null);
      setStatus("initial");
      return;
    }

    let cancelled = false;
    void refreshToken()
      .then((nextToken) => {
        if (!cancelled) {
          setToken(nextToken);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setToken(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, refreshToken]);

  const { latestData, state } = useInngestSubscription({
    token,
    enabled: enabled && token !== null,
    key: subscriptionKey,
  });

  useEffect(() => {
    reportSubscriptionReady(
      subscriptionKey,
      state === InngestSubscriptionState.Active,
    );
  }, [reportSubscriptionReady, state, subscriptionKey]);

  useEffect(() => {
    if (
      latestData?.kind !== "data" ||
      latestData.channel !== channel ||
      latestData.topic !== topic ||
      latestData.data.nodeId !== nodeId ||
      !isNodeStatus(latestData.data.status)
    ) {
      return;
    }

    setStatus(latestData.data.status);
  }, [channel, latestData, nodeId, topic]);

  return status;
}
