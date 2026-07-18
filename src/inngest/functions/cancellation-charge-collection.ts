import { z } from "zod";

import { collectCancellationCharge } from "@/features/studio/server/cancellation-collection-service";
import { markCancellationCollectionRetryExhausted } from "@/features/studio/server/cancellation-collection-state";
import { inngest } from "@/inngest/client";

const collectionEventSchema = z.object({ chargeId: z.string().min(1) });

export const collectCancellationChargePayment = inngest.createFunction(
  {
    id: "collect-cancellation-charge-payment",
    retries: 5,
    concurrency: { limit: 1, key: "event.data.chargeId" },
    onFailure: async ({ event }) => {
      const input = collectionEventSchema.safeParse(event.data.event.data);
      if (input.success) {
        await markCancellationCollectionRetryExhausted(input.data.chargeId);
      }
    },
  },
  { event: "studio/cancellation-charge.collection-requested" },
  async ({ event, step }) => {
    const { chargeId } = collectionEventSchema.parse(event.data);
    return step.run("collect-cancellation-charge", () =>
      collectCancellationCharge(chargeId),
    );
  },
);
