import type { NodeExecutor } from "@/features/executions/types";
import { clientLifecycleStageChangedTriggerChannel } from "@/inngest/channels/client-lifecycle-stage-changed-trigger";

export interface ClientLifecycleStageChangedTriggerConfig {
  variableName?: string;
  fromStage?: string; // Optional: trigger only when changing from this stage
  toStage?: string; // Optional: trigger only when changing to this stage
}

export const clientLifecycleStageChangedTriggerExecutor: NodeExecutor<
  ClientLifecycleStageChangedTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    clientLifecycleStageChangedTriggerChannel().status({
      nodeId,
      status: "loading",
    })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    // The lifecycle stage change data will be passed in through the context from the trigger
    // The context.triggerData should include oldStage and newStage

    await publish(
      clientLifecycleStageChangedTriggerChannel().status({
        nodeId,
        status: "success",
      })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      clientLifecycleStageChangedTriggerChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "clientStageChange";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
