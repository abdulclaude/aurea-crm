import { inngest } from "../client";
import { syncAllEmbeddings, syncSubaccountEmbeddings } from "@/lib/embeddings/sync";

/**
 * Daily cron job to sync all embeddings
 */
export const syncEmbeddingsDaily = inngest.createFunction(
  {
    id: "sync-embeddings-daily",
    retries: 3,
  },
  {
    cron: "0 2 * * 0", // Run at 2 AM weekly on Sundays (86% reduction)
  },
  async ({ step, logger }) => {
    const logs: string[] = [];
    const onProgress = (message: string) => {
      logs.push(message);
      logger.info(message);
    };

    const results = await step.run("sync-all-embeddings", async () => {
      const syncResults = await syncAllEmbeddings({ onProgress });

      // Convert Map to object for serialization
      const resultObject: Record<string, { contacts: number; deals: number; pipelines: number; workflows: number; total: number }> = {};
      syncResults.forEach((value, key) => {
        resultObject[key] = value;
      });

      return resultObject;
    });

    const totalVectors = Object.values(results).reduce(
      (sum, r) => sum + r.total,
      0
    );

    return {
      success: true,
      subaccountsProcessed: Object.keys(results).length,
      totalVectorsStored: totalVectors,
      results,
      logs,
    };
  }
);

/**
 * Manual reindex for a specific subaccount
 */
export const reindexSubaccount = inngest.createFunction(
  {
    id: "reindex-subaccount-embeddings",
    retries: 2,
  },
  {
    event: "embeddings/reindex.subaccount",
  },
  async ({ event, step, logger }) => {
    const { subaccountId } = event.data;
    const logs: string[] = [];

    const onProgress = (message: string) => {
      logs.push(message);
      logger.info(message);
    };

    const result = await step.run("sync-subaccount-embeddings", async () => {
      return await syncSubaccountEmbeddings(subaccountId, { onProgress });
    });

    return {
      success: true,
      subaccountId,
      result,
      logs,
    };
  }
);
