import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { waitChannel } from "@/inngest/channels/wait";

type WaitData = {
  variableName?: string;
  duration: number;
  unit: "seconds" | "minutes" | "hours" | "days";
};

const unitToMilliseconds = {
  seconds: 1000,
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
};

export const waitExecutor: NodeExecutor<WaitData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(waitChannel().status({ nodeId, status: "loading" }));

  try {
    if (!data.variableName) {
      await publish(waitChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Wait Node error: No variable name has been set."
      );
    }

    if (!data.duration || data.duration < 1) {
      await publish(waitChannel().status({ nodeId, status: "error" }));
      throw new NonRetriableError(
        "Wait Node error: Invalid duration specified."
      );
    }

    const durationMs = data.duration * unitToMilliseconds[data.unit];

    await step.sleep("wait-duration", durationMs);

    await publish(waitChannel().status({ nodeId, status: "success" }));

    const waitedUntil = new Date();

    return {
      ...context,
      [data.variableName]: {
        duration: data.duration,
        unit: data.unit,
        durationMs,
        waitedUntil: waitedUntil.toISOString(),
      },
    };
  } catch (error) {
    await publish(waitChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
