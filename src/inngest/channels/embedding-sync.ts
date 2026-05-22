import { inngest } from "../client";
import { syncAllEmbeddings, syncLocationEmbeddings } from "@/lib/embeddings/sync";

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
      const resultObject: Record<string, { clients: number; deals: number; pipelines: number; workflows: number; total: number }> = {};
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
      locationsProcessed: Object.keys(results).length,
      totalVectorsStored: totalVectors,
      results,
      logs,
    };
  }
);

/**
 * Manual reindex for a specific location
 */
export const reindexLocation = inngest.createFunction(
  {
    id: "reindex-location-embeddings",
    retries: 2,
  },
  {
    event: "embeddings/reindex.location",
  },
  async ({ event, step, logger }) => {
    const { locationId } = event.data;
    const logs: string[] = [];

    const onProgress = (message: string) => {
      logs.push(message);
      logger.info(message);
    };

    const result = await step.run("sync-location-embeddings", async () => {
      return await syncLocationEmbeddings(locationId, { onProgress });
    });

    return {
      success: true,
      locationId,
      result,
      logs,
    };
  }
);
