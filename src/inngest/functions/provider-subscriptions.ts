import { NonRetriableError } from "inngest";
import { z } from "zod";

import { renewGmailSubscriptions } from "@/features/gmail/server/subscriptions";
import {
  processGoogleCalendarSubscription,
  renewExpiringGoogleCalendarSubscriptions,
} from "@/features/google-calendar/server/subscriptions";
import {
  processOneDriveNotification,
  renewOneDriveSubscriptions,
} from "@/features/onedrive/server/subscriptions";
import {
  processOutlookNotification,
  renewOutlookSubscriptions,
} from "@/features/outlook/server/subscriptions";
import { inngest } from "@/inngest/client";

const googleCalendarEventSchema = z.object({
  subscriptionId: z.string().min(1),
  resourceState: z.string().nullable().optional(),
  messageNumber: z.string().regex(/^\d+$/),
});

const microsoftEventSchema = z.object({
  subscriptionId: z.string().min(1),
  changeType: z.string().min(1),
  resource: z.string().min(1),
  resourceData: z.object({ id: z.string().min(1).optional() }).optional(),
});

export const processGoogleCalendarSubscriptionNotification =
  inngest.createFunction(
    { id: "process-google-calendar-subscription-notification", retries: 5 },
    { event: "google-calendar/subscription.notification" },
    async ({ event }) => {
      const data = parse(googleCalendarEventSchema, event.data);
      await processGoogleCalendarSubscription(data.subscriptionId);
      return { processed: true };
    },
  );

export const processOutlookSubscriptionNotification = inngest.createFunction(
  {
    id: "process-outlook-subscription-notification",
    retries: 5,
    concurrency: { limit: 1, key: "event.data.subscriptionId" },
  },
  { event: "outlook/subscription.notification" },
  async ({ event }) =>
    processOutlookNotification(parse(microsoftEventSchema, event.data)),
);

export const processOneDriveSubscriptionNotification = inngest.createFunction(
  {
    id: "process-onedrive-subscription-notification",
    retries: 5,
    concurrency: { limit: 1, key: "event.data.subscriptionId" },
  },
  { event: "onedrive/subscription.notification" },
  async ({ event }) =>
    processOneDriveNotification(parse(microsoftEventSchema, event.data)),
);

export const reconcileProviderSubscriptions = inngest.createFunction(
  { id: "reconcile-provider-subscriptions", retries: 3 },
  { cron: "17 * * * *" },
  async ({ step }) => {
    const gmail = await step.run("renew-gmail-subscriptions", () =>
      renewGmailSubscriptions(),
    );
    const googleCalendar = await step.run(
      "renew-google-calendar-subscriptions",
      () => renewExpiringGoogleCalendarSubscriptions(),
    );
    const outlook = await step.run("renew-outlook-subscriptions", () =>
      renewOutlookSubscriptions(),
    );
    const oneDrive = await step.run("renew-onedrive-subscriptions", () =>
      renewOneDriveSubscriptions(),
    );
    return { gmail, googleCalendar, outlook, oneDrive };
  },
);

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new NonRetriableError("Provider subscription event payload is invalid.");
  }
  return result.data;
}
