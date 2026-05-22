import type { NodeExecutor } from "@/features/executions/types";
import type { Realtime } from "@inngest/realtime";

type StatusChannel = {
  status: (data: {
    nodeId: string;
    status: "loading" | "success" | "error";
  }) => Promise<Realtime.Message.Input>;
};

export type StudioTriggerConfig = {
  variableName?: string;
};

export function createStudioTriggerExecutor({
  channel,
  fallbackVariableName,
}: {
  channel: () => StatusChannel;
  fallbackVariableName: string;
}): NodeExecutor<StudioTriggerConfig> {
  return async ({ data, nodeId, context, publish }) => {
    await publish(channel().status({ nodeId, status: "loading" }));

    try {
      const variableName = normalizeVariableName(
        data?.variableName,
        fallbackVariableName,
      );

      await publish(channel().status({ nodeId, status: "success" }));

      return {
        ...context,
        [variableName]: context.triggerData || {},
      };
    } catch (error) {
      await publish(channel().status({ nodeId, status: "error" }));
      throw error;
    }
  };
}

function normalizeVariableName(
  value: string | undefined,
  fallback: string,
): string {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
