import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { sendClassReminderChannel } from "@/inngest/channels/send-class-reminder";
import { db } from "@/db";
import { studioBooking, studioClass as studioClassTable } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { resolveCommunicationRule } from "@/features/communications/server/control-service";

import {
  buildClassReminderPlans,
  CLASS_REMINDER_EVENT_KEY,
} from "./reminder-plan";
import {
  enqueueClassReminderEmail,
  enqueueClassReminderSms,
} from "./reminder-delivery";

type SendClassReminderData = {
  classId?: string;
  hoursBeforeClass?: number;
  templateId?: string;
};

export const sendClassReminderExecutor: NodeExecutor<
  SendClassReminderData
> = async ({ data, nodeId, scope, context, step, publish }) => {
  await publish(
    sendClassReminderChannel().status({ nodeId, status: "loading" }),
  );

  try {
    if (!data.classId) {
      await publish(
        sendClassReminderChannel().status({ nodeId, status: "error" }),
      );
      throw new NonRetriableError(
        "Send Class Reminder error: classId is required.",
      );
    }

    const result = await step.run("enqueue-class-reminders", async () => {
      const cls = await db.query.studioClass.findFirst({
        where: and(
          eq(studioClassTable.id, data.classId!),
          eq(studioClassTable.organizationId, scope.organizationId),
          scope.locationId
            ? eq(studioClassTable.locationId, scope.locationId)
            : isNull(studioClassTable.locationId),
        ),
        with: {
          studioBookings: {
            where: eq(studioBooking.status, "BOOKED"),
            with: { client: true },
          },
        },
      });

      if (!cls) {
        throw new NonRetriableError(
          `Send Class Reminder error: Class ${data.classId} not found.`,
        );
      }
      const resolvedRules = await Promise.all(
        (["EMAIL", "SMS"] as const).map((channel) =>
          resolveCommunicationRule({
            organizationId: scope.organizationId,
            locationId: scope.locationId,
            eventKey: CLASS_REMINDER_EVENT_KEY,
            channel,
            at: cls.startTime,
          }),
        ),
      );
      const recipients = cls.studioBookings.flatMap((booking) =>
        booking.client
          ? [
              {
                bookingId: booking.id,
                clientId: booking.client.id,
                name: booking.client.name,
                firstName: booking.client.firstName,
                email: booking.client.email,
                phone: booking.client.phone,
                mobilePhone: booking.client.mobilePhone,
                notificationPrefs: booking.client.notificationPrefs,
              },
            ]
          : [],
      );
      const plans = buildClassReminderPlans({
        studioClass: {
          id: cls.id,
          name: cls.name,
          startTime: cls.startTime,
          endTime: cls.endTime,
          instructorName: cls.instructorName,
          location: cls.location,
        },
        recipients,
        rules: resolvedRules.flatMap((rule) => (rule ? [rule] : [])),
      });

      const deliveries = [];
      for (const plan of plans) {
        deliveries.push(
          plan.channel === "EMAIL"
            ? await enqueueClassReminderEmail({
                organizationId: scope.organizationId,
                locationId: scope.locationId,
                plan,
              })
            : await enqueueClassReminderSms({
                organizationId: scope.organizationId,
                locationId: scope.locationId,
                plan,
              }),
        );
      }
      return {
        classId: cls.id,
        className: cls.name,
        queued: deliveries.filter((delivery) => delivery.status === "QUEUED")
          .length,
        suppressed: deliveries.filter(
          (delivery) => delivery.status === "SUPPRESSED",
        ).length,
        planned: plans.length,
        recipientCount: recipients.length,
        channels: resolvedRules.flatMap((rule) => (rule ? [rule.channel] : [])),
      };
    });

    await publish(
      sendClassReminderChannel().status({ nodeId, status: "success" }),
    );

    return {
      ...context,
      remindersSent: result.queued,
      remindersQueued: result.queued,
      remindersSuppressed: result.suppressed,
      remindersPlanned: result.planned,
      reminderRecipientCount: result.recipientCount,
      reminderChannels: result.channels,
      reminderEventKey: CLASS_REMINDER_EVENT_KEY,
      classId: result.classId,
      className: result.className,
    };
  } catch (error) {
    await publish(
      sendClassReminderChannel().status({ nodeId, status: "error" }),
    );
    throw error;
  }
};
