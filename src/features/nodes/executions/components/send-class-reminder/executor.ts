import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { sendClassReminderChannel } from "@/inngest/channels/send-class-reminder";
import { db } from "@/db";
import { studioBooking, studioClass as studioClassTable } from "@/db/schema";
import { eq } from "drizzle-orm";

type SendClassReminderData = {
  classId?: string;
  hoursBeforeClass?: number;
  templateId?: string;
};

export const sendClassReminderExecutor: NodeExecutor<
  SendClassReminderData
> = async ({ data, nodeId, context, step, publish }) => {
  await publish(sendClassReminderChannel().status({ nodeId, status: "loading" }));

  try {
    if (!data.classId) {
      await publish(
        sendClassReminderChannel().status({ nodeId, status: "error" })
      );
      throw new NonRetriableError(
        "Send Class Reminder error: classId is required."
      );
    }

    const studioClass = await step.run("get-class-details", async () => {
      const cls = await db.query.studioClass.findFirst({
        where: eq(studioClassTable.id, data.classId!),
        with: {
          studioBookings: {
            where: eq(studioBooking.status, "BOOKED"),
            with: { client: true },
          },
        },
      });

      if (!cls) {
        throw new NonRetriableError(
          `Send Class Reminder error: Class ${data.classId} not found.`
        );
      }

      return cls;
    });

    const remindersSent = await step.run("log-reminders", async () => {
      const clients = studioClass.studioBookings
        .map((booking) => booking.client)
        .filter(Boolean);

      return clients.length;
    });

    await publish(
      sendClassReminderChannel().status({ nodeId, status: "success" })
    );

    return {
      ...context,
      remindersSent,
      classId: studioClass.id,
      className: studioClass.name,
      hoursBeforeClass: data.hoursBeforeClass ?? 24,
    };
  } catch (error) {
    await publish(
      sendClassReminderChannel().status({ nodeId, status: "error" })
    );
    throw error;
  }
};
