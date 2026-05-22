import { inngest } from "../client";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  classReminderConfig,
  member,
  notification,
  studioBooking,
  studioClass,
} from "@/db/schema";
import { Resend } from "resend";
import { addHours, format } from "date-fns";

const resend = new Resend(process.env.RESEND_API_KEY);

function fromEmail(): string {
  return process.env.RESEND_FROM_EMAIL ?? "noreply@aurea.app";
}

export const sendClassReminders = inngest.createFunction(
  { id: "send-class-reminders", retries: 1 },
  { cron: "0 * * * *" },
  async () => {
    const now = new Date();
    const results = { checked: 0, sent: 0, failed: 0 };

    const configs = await db.query.classReminderConfig.findMany({
      where: eq(classReminderConfig.enabled, true),
    });

    for (const config of configs) {
      const windows: { label: string; from: Date; to: Date }[] = [];

      if (config.reminder24H) {
        const from = addHours(now, 23);
        const to = addHours(now, 25);
        windows.push({ label: "24h", from, to });
      }

      if (config.reminder1H) {
        const from = addHours(now, 0);
        const to = addHours(now, 2);
        windows.push({ label: "1h", from, to });
      }

      for (const window of windows) {
        const classes = await db.query.studioClass.findMany({
          where: and(
            eq(studioClass.organizationId, config.organizationId),
            gte(studioClass.startTime, window.from),
            lte(studioClass.startTime, window.to),
            eq(studioClass.status, "SCHEDULED")
          ),
          with: {
            studioBookings: {
              where: eq(studioBooking.status, "BOOKED"),
              with: { client: { columns: { id: true, name: true, email: true } } },
            },
            classType: { columns: { name: true } },
          },
        });

        for (const cls of classes) {
          for (const booking of cls.studioBookings) {
            results.checked++;
            if (!booking.client.email) continue;

            const alreadySent = await db.query.notification.findFirst({
              where: and(
                eq(notification.entityType, "class_reminder"),
                eq(notification.entityId, `${booking.id}-${window.label}`)
              ),
              columns: { id: true },
            });
            if (alreadySent) continue;

            try {
              if (config.emailEnabled) {
                await resend.emails.send({
                  from: fromEmail(),
                  to: [booking.client.email],
                  subject: `Reminder: ${cls.name} at ${format(cls.startTime, "h:mm a")}`,
                  html: buildReminderHtml({
                    memberName: booking.client.name,
                    className: cls.name,
                    classTime: format(cls.startTime, "EEEE, MMMM d 'at' h:mm a"),
                  }),
                });
              }

              const owner = await db.query.member.findFirst({
                where: and(
                  eq(member.organizationId, config.organizationId),
                  eq(member.role, "owner")
                ),
                columns: { userId: true },
              });

              if (owner) {
                await db.insert(notification).values({
                    id: createId(),
                    userId: owner.userId,
                    organizationId: config.organizationId,
                    type: "CLASS_REMINDER",
                    title: "Class reminder sent",
                    message: `${window.label} reminder for ${cls.name}`,
                    entityType: "class_reminder",
                    entityId: `${booking.id}-${window.label}`,
                });
              }

              results.sent++;
            } catch {
              results.failed++;
            }
          }
        }
      }
    }

    return results;
  },
);

function buildReminderHtml({ memberName, className, classTime }: { memberName: string; className: string; classTime: string }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:24px;text-align:center;border-radius:10px 10px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">Class Reminder</h1>
  </div>
  <div style="background:#fff;padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;">
    <p>Hi ${memberName},</p>
    <p>Just a reminder that your <strong>${className}</strong> class is coming up on <strong>${classTime}</strong>.</p>
    <p style="font-size:13px;color:#999;">See you there!</p>
  </div>
</body>
</html>`;
}
