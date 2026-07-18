import { NonRetriableError } from "inngest";
import { z } from "zod";

import { inngest } from "@/inngest/client";
import { syncLocationEmbeddings } from "@/lib/embeddings/sync";

const ReindexLocationEventSchema = z.object({
  locationId: z.string().min(1),
  credentialId: z.string().min(1),
});

export const reindexLocationEmbeddings = inngest.createFunction(
  {
    id: "reindex-location-embeddings",
    retries: 2,
  },
  { event: "embeddings/reindex.location" },
  async ({ event, step }) => {
    const parsed = ReindexLocationEventSchema.safeParse(event.data);
    if (!parsed.success) {
      throw new NonRetriableError("Embedding reindex event is invalid.");
    }

    return step.run("sync-location-embeddings", async () =>
      syncLocationEmbeddings(parsed.data.locationId, {
        credentialId: parsed.data.credentialId,
      }),
    );
  },
);
