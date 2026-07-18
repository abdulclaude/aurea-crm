import {
  dispatchDueDeliveryBatch,
  recoverExpiredDeliveryLeases,
} from "@/features/delivery/server/dispatcher";
import { inngest } from "@/inngest/client";

export const dispatchOutboundDeliveries = inngest.createFunction(
  {
    id: "dispatch-outbound-deliveries",
    retries: 0,
    concurrency: { limit: 4 },
  },
  { event: "delivery/dispatch.requested" },
  async ({ event, step }) => {
    const organizationId =
      typeof event.data.organizationId === "string"
        ? event.data.organizationId
        : undefined;
    const result = await step.run("dispatch-due-deliveries", () =>
      dispatchDueDeliveryBatch(organizationId),
    );

    if (result.remainingLikely) {
      await step.sendEvent("continue-delivery-dispatch", {
        name: "delivery/dispatch.requested",
        data: { organizationId },
      });
    }

    return result;
  },
);

export const retryOutboundDeliveries = inngest.createFunction(
  { id: "retry-outbound-deliveries", retries: 0 },
  { cron: "* * * * *" },
  async ({ step }) => {
    await step.sendEvent("dispatch-due-retries-and-scheduled-deliveries", {
      name: "delivery/dispatch.requested",
      data: {},
    });
    return { queued: true };
  },
);

export const recoverOutboundDeliveryLeases = inngest.createFunction(
  { id: "recover-outbound-delivery-leases", retries: 0 },
  { cron: "*/5 * * * *" },
  async ({ step }) =>
    step.run("recover-expired-delivery-leases", () =>
      recoverExpiredDeliveryLeases(),
    ),
);
