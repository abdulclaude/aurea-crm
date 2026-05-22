import { inngest } from "../client";
import { asc, count, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { classWaitlist, studioBooking, studioClass as studioClassTable } from "@/db/schema";
import { Resend } from "resend";
import { format } from "date-fns";

const resend = new Resend(process.env.RESEND_API_KEY);

function fromEmail(): string {
  return process.env.RESEND_FROM_EMAIL ?? "noreply@aurea.app";
}

export const autoPromoteWaitlist = inngest.createFunction(
  { id: "auto-promote-waitlist", retries: 2 },
  { event: "studio/booking.cancelled" },
  async ({ event }) => {
    const { classId, organizationId } = event.data as {
      classId: string;
      organizationId: string;
    };

    const studioClass = await db.query.studioClass.findFirst({
      where: (classTable, { and, eq }) =>
        and(
          eq(classTable.id, classId),
          eq(classTable.organizationId, organizationId),
          eq(classTable.status, "SCHEDULED")
        ),
    });

    if (!studioClass) return { skipped: true, reason: "class not found or cancelled" };

    const [bookingTotal] = await db
      .select({ count: count(studioBooking.id) })
      .from(studioBooking)
      .where(eq(studioBooking.classId, classId));

    if (studioClass.maxCapacity && (bookingTotal?.count ?? 0) >= studioClass.maxCapacity) {
      return { skipped: true, reason: "class still full" };
    }

    const nextEntry = await db.query.classWaitlist.findFirst({
      where: (waitlist, { and, eq }) =>
        and(eq(waitlist.classId, classId), eq(waitlist.status, "WAITING")),
      orderBy: [asc(classWaitlist.position)],
      with: {
        client: {
          columns: { id: true, name: true, email: true },
        },
      },
    });

    if (!nextEntry) return { skipped: true, reason: "waitlist empty" };

    await db
      .update(classWaitlist)
      .set({ status: "NOTIFIED", notifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(classWaitlist.id, nextEntry.id));

    if (nextEntry.client.email) {
      try {
        await resend.emails.send({
          from: fromEmail(),
          to: [nextEntry.client.email],
          subject: `A spot opened up in ${studioClass.name}!`,
          html: buildWaitlistNotifyHtml({
            memberName: nextEntry.client.name,
            className: studioClass.name,
            classTime: format(studioClass.startTime, "EEEE, MMMM d 'at' h:mm a"),
          }),
        });
      } catch (err) {
        console.error("Failed to send waitlist notification:", err);
      }
    }

    return { notified: true, clientId: nextEntry.client.id };
  },
);

export const expireWaitlistNotifications = inngest.createFunction(
  { id: "expire-waitlist-notifications", retries: 0 },
  { cron: "*/15 * * * *" },
  async () => {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const expired = await db.query.classWaitlist.findMany({
      where: (waitlist, { and, eq }) =>
        and(eq(waitlist.status, "NOTIFIED"), lte(waitlist.notifiedAt, fifteenMinutesAgo)),
      with: {
        studioClass: { columns: { id: true, organizationId: true } },
      },
    });

    let promoted = 0;
    for (const entry of expired) {
      await db
        .update(classWaitlist)
        .set({ status: "EXPIRED", updatedAt: new Date() })
        .where(eq(classWaitlist.id, entry.id));

      await inngest.send({
        name: "studio/booking.cancelled",
        data: {
          classId: entry.studioClass.id,
          organizationId: entry.studioClass.organizationId,
        },
      });
      promoted++;
    }

    return { expired: promoted };
  },
);

function buildWaitlistNotifyHtml({ memberName, className, classTime }: { memberName: string; className: string; classTime: string }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:24px;text-align:center;border-radius:10px 10px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">A Spot Opened Up!</h1>
  </div>
  <div style="background:#fff;padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;">
    <p>Hi ${memberName},</p>
    <p>Great news! A spot has opened up in <strong>${className}</strong> on <strong>${classTime}</strong>.</p>
    <p>You have <strong>15 minutes</strong> to confirm your booking before it's offered to the next person on the waitlist.</p>
    <p style="font-size:13px;color:#999;">Log in to your member portal to confirm.</p>
  </div>
</body>
</html>`;
}
