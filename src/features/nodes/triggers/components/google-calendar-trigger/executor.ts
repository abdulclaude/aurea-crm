import type { NodeExecutor } from "@/features/executions/types";
import { googleCalendarTriggerChannel } from "@/inngest/channels/google-calendar-trigger";

type GoogleCalendarTriggerData = Record<string, unknown>;

export const googleCalendarTriggerExecutor: NodeExecutor<
  GoogleCalendarTriggerData
> = async ({ nodeId, context, step, publish }) => {
  await publish(
    googleCalendarTriggerChannel().status({ nodeId, status: "loading" })
  );

  const result = await step.run("google-calendar-trigger", async () => context);

  await publish(
    googleCalendarTriggerChannel().status({ nodeId, status: "success" })
  );

  return result;
};
