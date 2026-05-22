import { inngest } from "../client";
import { deliverSms } from "@/features/sms/lib/send-sms";
import { db } from "@/db";
import { smsMessage } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export const processSmsQueue = inngest.createFunction(
  { id: "process-sms-queue", retries: 2 },
  { cron: "*/2 * * * *" },
  async ({ step }) => {
    const results = { processed: 0, sent: 0, failed: 0 };

    const queued = await step.run("fetch-queued-messages", async () => {
      return db.query.smsMessage.findMany({
        where: eq(smsMessage.status, "QUEUED"),
        columns: { id: true },
        limit: 50,
        orderBy: asc(smsMessage.createdAt),
      });
    });

    if (queued.length === 0) return results;

    for (const msg of queued) {
      const result = await step.run(`deliver-sms-${msg.id}`, async () => {
        return deliverSms(msg.id);
      });

      results.processed++;
      if (result.status === "SENT") {
        results.sent++;
      } else {
        results.failed++;
      }
    }

    return results;
  },
);
