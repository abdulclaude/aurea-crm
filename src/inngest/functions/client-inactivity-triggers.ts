import { evaluateClientInactivityTriggers } from "@/features/workflows/server/client-inactivity-trigger-service";
import { inngest } from "@/inngest/client";

export const evaluateScheduledClientInactivityTriggers = inngest.createFunction(
  {
    id: "evaluate-client-inactivity-triggers",
    retries: 2,
    concurrency: { limit: 1 },
  },
  { cron: "13 4 * * *" },
  async ({ step }) =>
    step.run("evaluate-inactivity-policies", async () => ({
      triggered: await evaluateClientInactivityTriggers(),
    })),
);
