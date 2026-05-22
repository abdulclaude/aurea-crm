import type { NodeExecutor } from "@/features/executions/types";
import { waitlistSpotOpenedTriggerChannel } from "@/inngest/channels/waitlist-spot-opened-trigger";

export interface WaitlistSpotOpenedTriggerConfig {
  variableName?: string;
}

export const waitlistSpotOpenedTriggerExecutor: NodeExecutor<
  WaitlistSpotOpenedTriggerConfig
> = async ({ data, nodeId, context, publish }) => {
  await publish(
    waitlistSpotOpenedTriggerChannel().status({ nodeId, status: "loading" })
  );

  try {
    const variableName = normalizeVariableName(data?.variableName);

    await publish(
      waitlistSpotOpenedTriggerChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      [variableName]: context.triggerData || {},
    };
  } catch (error) {
    await publish(
      waitlistSpotOpenedTriggerChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};

function normalizeVariableName(value?: string | null) {
  const fallback = "waitlistSpot";
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
