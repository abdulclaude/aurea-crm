import "server-only";

import { inngest } from "@/inngest/client";

export async function enqueueCancellationCollections(
  chargeIds: string[],
): Promise<void> {
  const uniqueIds = [...new Set(chargeIds)];
  if (uniqueIds.length === 0) return;

  await inngest.send(
    uniqueIds.map((chargeId) => ({
      name: "studio/cancellation-charge.collection-requested",
      data: { chargeId },
    })),
  );
}
