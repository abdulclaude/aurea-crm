import { inngest } from "../client";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  client,
  notification,
  studioBooking,
  studioClass,
  instructor,
} from "@/db/schema";
import { createId } from "@paralleldrive/cuid2";
import { subHours, startOfDay, endOfDay } from "date-fns";

export const detectNoShows = inngest.createFunction(
  { id: "detect-no-shows", retries: 1 },
  { cron: "*/30 * * * *" },
  async () => {
    const now = new Date();
    const cutoff = subHours(now, 1);

    const endedClasses = await db.query.studioClass.findMany({
      where: and(
        lte(studioClass.endTime, cutoff),
        gte(studioClass.endTime, subHours(now, 4)),
        eq(studioClass.status, "SCHEDULED")
      ),
      with: {
        studioBookings: {
          where: eq(studioBooking.status, "BOOKED"),
          columns: { id: true, clientId: true },
        },
        checkIns: {
          columns: { clientId: true },
        },
      },
    });

    let totalNoShows = 0;

    for (const cls of endedClasses) {
      const checkedInIds = new Set(cls.checkIns.map((checkIn) => checkIn.clientId));

      for (const booking of cls.studioBookings) {
        if (checkedInIds.has(booking.clientId)) continue;

        await db
          .update(studioBooking)
          .set({ status: "NO_SHOW", updatedAt: now })
          .where(eq(studioBooking.id, booking.id));

        totalNoShows++;
      }
    }

    return { classesChecked: endedClasses.length, noShows: totalNoShows };
  },
);

export const dailyNoShowSummary = inngest.createFunction(
  { id: "daily-no-show-summary", retries: 0 },
  { cron: "0 22 * * *" },
  async () => {
    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);

    const noShows = await db
      .select({
        clientName: client.name,
        className: studioClass.name,
        organizationId: studioClass.organizationId,
        instructorUserId: instructor.userId,
      })
      .from(studioBooking)
      .innerJoin(client, eq(client.id, studioBooking.clientId))
      .innerJoin(studioClass, eq(studioClass.id, studioBooking.classId))
      .leftJoin(instructor, eq(instructor.id, studioClass.instructorId))
      .where(
        and(
          eq(studioBooking.status, "NO_SHOW"),
          gte(studioClass.startTime, start),
          lte(studioClass.startTime, end)
        )
      );

    // Group no-shows by instructor (only classes with an assigned instructor)
    const byInstructor = new Map<
      string,
      { orgId: string; items: typeof noShows }
    >();
    for (const ns of noShows) {
      const instructorUserId = ns.instructorUserId;
      if (!instructorUserId) continue;

      if (!byInstructor.has(instructorUserId)) {
        byInstructor.set(instructorUserId, {
          orgId: ns.organizationId,
          items: [],
        });
      }
      byInstructor.get(instructorUserId)!.items.push(ns);
    }

    for (const [userId, { orgId, items }] of byInstructor) {
      await db.insert(notification).values({
          id: createId(),
          userId,
          organizationId: orgId,
          type: "NO_SHOW_SUMMARY",
          title: `${items.length} no-show${items.length === 1 ? "" : "s"} today`,
          message: items
            .map((ns) => `${ns.clientName} missed ${ns.className}`)
            .join(", "),
          entityType: "no_show_summary",
          entityId: `daily-${start.toISOString().split("T")[0]}`,
      });
    }

    return { totalNoShows: noShows.length, instructorsNotified: byInstructor.size };
  },
);
