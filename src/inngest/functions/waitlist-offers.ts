import { z } from "zod";

import { expireDueWaitlistOffers } from "@/features/studio/server/waitlist-offer-expiration";
import {
  findPendingWaitlistSpotOpenedDispatches,
  processWaitlistSpotOpenedDispatch,
} from "@/features/studio/server/waitlist-workflow-dispatch";
import { inngest } from "@/inngest/client";

const dispatchEventSchema = z.object({
  waitlistId: z.string().min(1).max(128),
});

export const dispatchWaitlistOffer = inngest.createFunction(
  { id: "dispatch-waitlist-offer", retries: 5, concurrency: { limit: 10 } },
  { event: "studio/waitlist-offer.dispatch" },
  async ({ event, step }) => {
    const { waitlistId } = dispatchEventSchema.parse(event.data);
    return step.run("dispatch-waitlist-offer-workflows", () =>
      processWaitlistSpotOpenedDispatch(waitlistId),
    );
  },
);

export const recoverWaitlistOffers = inngest.createFunction(
  { id: "recover-waitlist-offers", retries: 2, concurrency: { limit: 1 } },
  { cron: "* * * * *" },
  async ({ step }) => {
    const expired = await step.run("expire-due-waitlist-offers", () =>
      expireDueWaitlistOffers(),
    );
    const pending = await step.run("find-pending-waitlist-dispatches", () =>
      findPendingWaitlistSpotOpenedDispatches(),
    );
    const waitlistIds = Array.from(
      new Set([...expired.waitlistOffers.map((offer) => offer.id), ...pending]),
    );
    if (waitlistIds.length > 0) {
      await step.sendEvent(
        "dispatch-recovered-waitlist-offers",
        waitlistIds.map((waitlistId) => ({
          name: "studio/waitlist-offer.dispatch" as const,
          id: `waitlist-offer-recovery:${waitlistId}:${Date.now()}`,
          data: { waitlistId },
        })),
      );
    }
    return { expired: expired.expired, recovered: waitlistIds.length };
  },
);
