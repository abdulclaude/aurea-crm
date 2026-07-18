import "server-only";

import { inngest } from "@/inngest/client";

export async function requestDeliveryDispatch(
  organizationId: string,
): Promise<void> {
  try {
    await inngest.send({
      name: "delivery/dispatch.requested",
      data: { organizationId },
    });
  } catch (error) {
    // The scheduled delivery sweep is the durable fallback for a missed nudge.
    console.error("Failed to request delivery dispatch", {
      organizationId,
      error: error instanceof Error ? error.message : "Unknown Inngest error",
    });
  }
}
