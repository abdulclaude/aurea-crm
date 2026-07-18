import { PermanentStripeEventError } from "@/features/commerce/server/stripe/stripe-event-contract";
import { processStripeEventByReceiptSource } from "@/features/commerce/server/stripe/stripe-event-dispatcher";
import {
  listRetryableStripeEventIds,
  loadStripeEventForReplay,
  markStripeEventDeadLetter,
  processStripeEventReceipt,
  purgeExpiredStripePayloads,
} from "@/features/commerce/server/stripe/stripe-event-receipt";
import { inngest } from "@/inngest/client";
import { triggerPricingOptionPurchasedWorkflowsForReceipt } from "@/features/workflows/server/pricing-option-purchased-trigger-service";

export const retryStripeEventReceipts = inngest.createFunction(
  {
    id: "retry-stripe-event-receipts",
    retries: 0,
    concurrency: { limit: 1 },
  },
  { cron: "* * * * *" },
  async ({ step }) => {
    const receiptIds = await step.run("list-retryable-stripe-events", () =>
      listRetryableStripeEventIds(50),
    );
    const results = [];
    for (const [index, receiptId] of receiptIds.entries()) {
      const result = await step.run(`retry-stripe-event-${index}`, async () => {
        try {
          const event = await loadStripeEventForReplay(receiptId);
          const processed = await processStripeEventReceipt({
            receiptId,
            event,
            processor: processStripeEventByReceiptSource,
          });
          if (processed.status === "PROCESSED") {
            await triggerPricingOptionPurchasedWorkflowsForReceipt(receiptId);
          }
          return processed;
        } catch (error) {
          if (error instanceof PermanentStripeEventError) {
            await markStripeEventDeadLetter({ receiptId, error });
            return {
              status: "DEAD_LETTER" as const,
              duplicate: false,
              retryable: false,
            };
          }
          throw error;
        }
      });
      results.push(result);
    }
    return {
      attempted: results.length,
      deadLetters: results.filter((result) => result.status === "DEAD_LETTER")
        .length,
    };
  },
);

export const purgeStripeEventPayloads = inngest.createFunction(
  { id: "purge-stripe-event-payloads", retries: 2 },
  { cron: "15 3 * * *" },
  async ({ step }) =>
    step.run("purge-expired-stripe-payloads", async () => ({
      purged: await purgeExpiredStripePayloads(),
    })),
);
