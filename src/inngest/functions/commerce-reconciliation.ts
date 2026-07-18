import { z } from "zod";

import {
  executeReceiptReconciliation,
  failReceiptReconciliation,
} from "@/features/commerce/server/reconciliation-runner";
import { inngest } from "@/inngest/client";

const reconciliationEventSchema = z.object({
  runId: z.string().uuid(),
  organizationId: z.string().min(1),
});

export const processCommerceReconciliation = inngest.createFunction(
  {
    id: "commerce-reconciliation-process",
    retries: 2,
    concurrency: { limit: 2 },
    idempotency: "event.data.runId",
    onFailure: async ({ event }) => {
      const input = reconciliationEventSchema.safeParse(
        event.data.event.data,
      );
      if (input.success) {
        await failReceiptReconciliation(input.data);
      }
    },
  },
  { event: "commerce/reconciliation.requested" },
  async ({ event, step }) => {
    const input = reconciliationEventSchema.parse(event.data);
    return step.run("reconcile-receipts", () =>
      executeReceiptReconciliation(input),
    );
  },
);
