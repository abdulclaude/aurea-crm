import { gmailNotificationInputSchema } from "@/features/gmail/server/pubsub-contract";
import { processGmailNotification } from "@/features/gmail/server/subscriptions";
import { inngest } from "@/inngest/client";

export const processGmailNotificationEvent = inngest.createFunction(
  {
    id: "process-gmail-notification",
    retries: 5,
    concurrency: { limit: 1, key: "event.data.subscriptionId" },
  },
  { event: "gmail/subscription.notification" },
  async ({ event }) => {
    const input = gmailNotificationInputSchema.parse(event.data);
    return processGmailNotification(input);
  },
);
