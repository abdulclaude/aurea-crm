import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { addDays, addHours, setHours, setMinutes, startOfDay, subDays } from "date-fns";
import { and, eq, inArray } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  checkIn,
  classCredit,
  classType,
  client,
  instructor,
  membershipPlan,
  room,
  studioBooking,
  studioClass,
  studioMembership,
} from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

function cuid() {
  return `c${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function locationFilter(column: AnyPgColumn, locationId: string | null) {
  return locationId ? eq(column, locationId) : undefined;
}

export const seedRouter = createTRPCRouter({
  populateStudioData: protectedProcedure.mutation(async ({ ctx }) => {
    const orgId = ctx.orgId;
    const locationId = ctx.locationId ?? null;

    if (!orgId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active organization",
      });
    }

    const now = new Date();
    const today = startOfDay(now);

    const existingClasses = await db.query.studioClass.findMany({
      where: and(
        eq(studioClass.organizationId, orgId),
        locationFilter(studioClass.locationId, locationId)
      ),
      columns: { id: true },
    });
    const classIds = existingClasses.map((item) => item.id);

    if (classIds.length > 0) {
      await db.delete(checkIn).where(inArray(checkIn.classId, classIds));
      await db.delete(studioBooking).where(inArray(studioBooking.classId, classIds));
    }

    const existingMemberships = await db.query.studioMembership.findMany({
      where: and(
        eq(studioMembership.organizationId, orgId),
        locationFilter(studioMembership.locationId, locationId)
      ),
      columns: { id: true },
    });
    const membershipIds = existingMemberships.map((item) => item.id);
    if (membershipIds.length > 0) {
      await db.delete(classCredit).where(inArray(classCredit.membershipId, membershipIds));
    }

    await db.delete(studioMembership).where(
      and(
        eq(studioMembership.organizationId, orgId),
        locationFilter(studioMembership.locationId, locationId)
      )
    );
    await db.delete(studioClass).where(
      and(
        eq(studioClass.organizationId, orgId),
        locationFilter(studioClass.locationId, locationId)
      )
    );
    await db.delete(client).where(
      and(eq(client.organizationId, orgId), locationFilter(client.locationId, locationId))
    );
    await db.delete(instructor).where(
      and(
        eq(instructor.organizationId, orgId),
        locationFilter(instructor.locationId, locationId)
      )
    );
    await db.delete(room).where(
      and(eq(room.organizationId, orgId), locationFilter(room.locationId, locationId))
    );
    await db.delete(classType).where(
      and(
        eq(classType.organizationId, orgId),
        locationFilter(classType.locationId, locationId)
      )
    );
    await db.delete(membershipPlan).where(
      and(
        eq(membershipPlan.organizationId, orgId),
        locationFilter(membershipPlan.locationId, locationId)
      )
    );

    const rooms = [
      { id: cuid(), name: "Main Studio", capacity: 25, description: "Large open studio" },
      { id: cuid(), name: "Reformer Lab", capacity: 12, description: "Pilates reformer room" },
      { id: cuid(), name: "Spin Cave", capacity: 30, description: "Indoor cycling studio" },
    ];

    await db.insert(room).values(
      rooms.map((item) => ({
        ...item,
        organizationId: orgId,
        locationId,
        createdAt: now,
        updatedAt: now,
      }))
    );

    const classTypes = [
      { id: cuid(), name: "Vinyasa Flow", slug: "vinyasa-flow", color: "#6366f1" },
      { id: cuid(), name: "Mat Pilates", slug: "mat-pilates", color: "#10b981" },
      { id: cuid(), name: "Reformer Pilates", slug: "reformer-pilates", color: "#f59e0b" },
      { id: cuid(), name: "HIIT", slug: "hiit", color: "#ec4899" },
      { id: cuid(), name: "Spin", slug: "spin", color: "#3b82f6" },
    ];

    await db.insert(classType).values(
      classTypes.map((item) => ({
        ...item,
        description: `${item.name} demo class type`,
        organizationId: orgId,
        locationId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }))
    );

    const instructors = [
      {
        id: cuid(),
        name: "Sarah Chen",
        email: "sarah@demo.studio",
        role: "Lead Instructor",
        instructorSpecialties: ["Vinyasa", "Power Yoga"],
      },
      {
        id: cuid(),
        name: "James Wilson",
        email: "james@demo.studio",
        role: "Instructor",
        instructorSpecialties: ["Spin", "HIIT"],
      },
      {
        id: cuid(),
        name: "Emma Rodriguez",
        email: "emma@demo.studio",
        role: "Instructor",
        instructorSpecialties: ["Mat Pilates", "Reformer Pilates"],
      },
    ];

    await db.insert(instructor).values(
      instructors.map((item) => ({
        ...item,
        organizationId: orgId,
        locationId,
        isActive: true,
        hourlyRate: "45",
        currency: "USD",
        createdAt: now,
        updatedAt: now,
      }))
    );

    const plans = [
      {
        id: cuid(),
        name: "Unlimited Monthly",
        type: "UNLIMITED" as const,
        price: "149.00",
        billingInterval: "MONTHLY" as const,
        classCredits: null,
      },
      {
        id: cuid(),
        name: "10-Class Pack",
        type: "CLASS_PACK" as const,
        price: "180.00",
        billingInterval: "ONE_TIME" as const,
        classCredits: 10,
      },
      {
        id: cuid(),
        name: "Drop-In",
        type: "DROP_IN" as const,
        price: "25.00",
        billingInterval: "ONE_TIME" as const,
        classCredits: 1,
      },
    ];

    await db.insert(membershipPlan).values(
      plans.map((item, index) => ({
        ...item,
        description: `${item.name} demo plan`,
        organizationId: orgId,
        locationId,
        currency: "USD",
        sortOrder: index,
        isActive: true,
        isPublic: true,
        createdAt: now,
        updatedAt: now,
      }))
    );

    const clients = Array.from({ length: 18 }, (_, index) => {
      const active = index < 14;
      const createdAt = subDays(now, 10 + index * 3);
      return {
        id: cuid(),
        name: [
          "Olivia Harper",
          "Liam Johnson",
          "Sophia Martinez",
          "Noah Williams",
          "Isabella Brown",
          "Mason Davis",
          "Ava Garcia",
          "Ethan Anderson",
          "Mia Thomas",
          "Lucas Jackson",
          "Charlotte White",
          "Aiden Harris",
          "Amelia Clark",
          "Harper Lewis",
          "Elijah Robinson",
          "Evelyn Walker",
          "Daniel Young",
          "Abigail King",
        ][index],
        email: `member${index + 1}@demo.studio`,
        phone: `+1-555-${String(1000 + index).padStart(4, "0")}`,
        type: active ? ("CUSTOMER" as const) : ("LEAD" as const),
        lifecycleStage: active ? ("CUSTOMER" as const) : ("LEAD" as const),
        acquisitionStage: active ? ("ACTIVE" as const) : ("TRIAL" as const),
        attendanceCount: active ? 6 + index * 2 : index % 3,
        currentStreak: active ? (index % 6) + 1 : 0,
        tags: active ? ["member"] : ["trial"],
        organizationId: orgId,
        locationId,
        score: active ? 80 - index : 45 + index,
        source: active ? "Demo import" : "Intro offer",
        birthMonth: ((index + 1) % 12) + 1,
        birthDay: (index % 27) + 1,
        acquiredAt: active ? createdAt : null,
        trialStartedAt: active ? null : subDays(now, index + 1),
        trustedMember: index === 0 || index === 5,
        waiverSignedAt: active ? createdAt : null,
        createdAt,
        updatedAt: now,
      };
    });

    await db.insert(client).values(clients);

    const memberships = clients.slice(0, 14).map((item, index) => {
      const plan = plans[index % plans.length];
      const startDate = subDays(now, 45 - index);
      return {
        id: cuid(),
        clientId: item.id,
        name: plan.name,
        status: "ACTIVE" as const,
        startDate,
        endDate:
          plan.billingInterval === "MONTHLY" ? addDays(startDate, 30) : null,
        price: plan.price,
        currency: "USD",
        planId: plan.id,
        organizationId: orgId,
        locationId,
        autoRenew: plan.billingInterval !== "ONE_TIME",
        createdAt: startDate,
        updatedAt: now,
      };
    });

    await db.insert(studioMembership).values(memberships);

    const creditRows = memberships
      .map((membership, index) => {
        const plan = plans.find((item) => item.id === membership.planId);
        if (!plan?.classCredits) {
          return null;
        }
        return {
          id: cuid(),
          membershipId: membership.id,
          clientId: membership.clientId,
          totalCredits: plan.classCredits,
          usedCredits: Math.min(index % 5, plan.classCredits),
          expiresAt: membership.endDate,
          createdAt: membership.createdAt,
          updatedAt: now,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    if (creditRows.length > 0) {
      await db.insert(classCredit).values(creditRows);
    }

    const classes = Array.from({ length: 24 }, (_, index) => {
      const classStart = setMinutes(
        setHours(addDays(today, Math.floor(index / 4)), 7 + (index % 4) * 3),
        index % 2 === 0 ? 0 : 30
      );
      const type = classTypes[index % classTypes.length];
      const teacher = instructors[index % instructors.length];
      const studioRoom = rooms[index % rooms.length];
      const capacity = studioRoom.capacity ?? 20;

      return {
        id: cuid(),
        name: type.name,
        description: `${type.name} demo class`,
        organizationId: orgId,
        locationId,
        classTypeId: type.id,
        instructorId: teacher.id,
        instructorName: teacher.name,
        roomId: studioRoom.id,
        roomName: studioRoom.name,
        startTime: classStart,
        endTime: addHours(classStart, 1),
        maxCapacity: capacity,
        minCapacity: 3,
        bookedCount: Math.min(4 + (index % 8), capacity),
        status: "SCHEDULED" as const,
        color: type.color,
        isRecurring: false,
        isVirtual: false,
        createdAt: now,
        updatedAt: now,
      };
    });

    await db.insert(studioClass).values(classes);

    const bookings = classes.flatMap((classItem, classIndex) =>
      clients.slice(0, Math.min(classItem.bookedCount, clients.length)).map((member, index) => ({
        id: randomUUID(),
        classId: classItem.id,
        clientId: member.id,
        status: index < 2 && classIndex < 6 ? ("ATTENDED" as const) : ("BOOKED" as const),
        bookedAt: subDays(now, (index % 5) + 1),
        checkedInAt: index < 2 && classIndex < 6 ? classItem.startTime : null,
        createdAt: subDays(now, (index % 5) + 1),
        updatedAt: now,
      }))
    );

    await db.insert(studioBooking).values(bookings);

    const checkIns = bookings
      .filter((booking) => booking.status === "ATTENDED")
      .map((booking) => {
        const classItem = classes.find((item) => item.id === booking.classId);
        return {
          id: randomUUID(),
          clientId: booking.clientId,
          classId: booking.classId,
          method: "MANUAL" as const,
          checkedInAt: booking.checkedInAt ?? now,
          checkedInBy: ctx.auth.user.id,
          isLateArrival: false,
          organizationId: orgId,
          locationId,
          createdAt: classItem?.startTime ?? now,
        };
      });
    if (checkIns.length > 0) {
      await db.insert(checkIn).values(checkIns);
    }

    return {
      success: true,
      counts: {
        rooms: rooms.length,
        classTypes: classTypes.length,
        instructors: instructors.length,
        clients: clients.length,
        memberships: memberships.length,
        classes: classes.length,
        bookings: bookings.length,
        checkIns: checkIns.length,
      },
    };
  }),
});
