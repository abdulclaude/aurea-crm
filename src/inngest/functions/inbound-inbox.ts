import { z } from "zod";

import {
  processInboundMessageReceipt,
  recoverExpiredInboundReceiptLeases,
} from "@/features/inbox/server/inbound-processor";
import { inngest } from "@/inngest/client";

const inboundReceiptEventSchema = z.object({ receiptId: z.string().min(1) });

export const processInboundInboxReceipt = inngest.createFunction(
  { id: "process-inbound-inbox-receipt", retries: 5 },
  { event: "inbox/inbound.receipt" },
  async ({ event, step }) => {
    const { receiptId } = inboundReceiptEventSchema.parse(event.data);
    return step.run("process-inbound-receipt", () =>
      processInboundMessageReceipt(receiptId),
    );
  },
);

export const recoverInboundInboxReceipts = inngest.createFunction(
  { id: "recover-inbound-inbox-receipts", retries: 2 },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    const receiptIds = await step.run("recover-expired-receipts", () =>
      recoverExpiredInboundReceiptLeases(),
    );
    if (receiptIds.length > 0) {
      await step.sendEvent(
        "retry-recovered-receipts",
        receiptIds.map((receiptId) => ({
          name: "inbox/inbound.receipt" as const,
          id: `inbox-inbound-receipt-recovered:${receiptId}:${Date.now()}`,
          data: { receiptId },
        })),
      );
    }
    return { recovered: receiptIds.length };
  },
);
