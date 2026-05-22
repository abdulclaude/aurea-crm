import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { addDays, addHours, setHours, setMinutes, startOfDay, subDays } from "date-fns";
import { and, eq, inArray } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  activity,
  automationEvent,
  campaign,
  checkIn,
  classCredit,
  classType,
  classWaitlist,
  client,
  instructor,
  instructorPayout,
  membershipPlan,
  referral,
  referralProgram,
  room,
  studioBooking,
  studioClass,
  studioMembership,
  studioPayment,
  studioPaymentLineItem,
  studioProduct,
} from "@/db/schema";
import { deleteRedisCacheMatching } from "@/lib/redis/read-through-cache";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

function cuid() {
  return `c${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function locationFilter(column: AnyPgColumn, locationId: string | null) {
  return locationId ? eq(column, locationId) : undefined;
}

function demoMetadata() {
  return { source: "demo-seed" };
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

    const rooms = [
      { id: cuid(), name: "Main Studio", capacity: 25, description: "Large open studio" },
      { id: cuid(), name: "Reformer Lab", capacity: 12, description: "Pilates reformer room" },
      { id: cuid(), name: "Spin Cave", capacity: 30, description: "Indoor cycling studio" },
    ];

    const classTypes = [
      { id: cuid(), name: "Vinyasa Flow", slug: `demo-vinyasa-flow-${cuid()}`, color: "#6366f1" },
      { id: cuid(), name: "Mat Pilates", slug: `demo-mat-pilates-${cuid()}`, color: "#10b981" },
      { id: cuid(), name: "Reformer Pilates", slug: `demo-reformer-pilates-${cuid()}`, color: "#f59e0b" },
      { id: cuid(), name: "HIIT", slug: `demo-hiit-${cuid()}`, color: "#ec4899" },
      { id: cuid(), name: "Spin", slug: `demo-spin-${cuid()}`, color: "#3b82f6" },
    ];

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
      {
        id: cuid(),
        name: "Intro Reformer Trial",
        type: "INTRO_OFFER" as const,
        price: "39.00",
        billingInterval: "ONE_TIME" as const,
        classCredits: 3,
        isIntroOffer: true,
      },
    ];

    const clients = Array.from({ length: 18 }, (_, index) => {
      const active = index < 14;
      const churned = index === 17;
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
        type: active ? ("CUSTOMER" as const) : churned ? ("CHURN" as const) : ("LEAD" as const),
        lifecycleStage: active || churned ? ("CUSTOMER" as const) : ("LEAD" as const),
        acquisitionStage: active ? ("ACTIVE" as const) : churned ? ("LOST" as const) : ("TRIAL" as const),
        attendanceCount: active ? 6 + index * 2 : index % 3,
        currentStreak: active ? (index % 6) + 1 : 0,
        tags: active ? ["member"] : churned ? ["churned"] : ["trial"],
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

    const memberships = clients.slice(0, 14).map((item, index) => {
      const plan = plans[index % 3];
      const startDate = subDays(now, index < 8 ? 4 + index * 3 : 38 + index);
      return {
        id: cuid(),
        clientId: item.id,
        name: plan.name,
        status: index === 3 ? ("CANCELLED" as const) : ("ACTIVE" as const),
        startDate,
        endDate:
          index === 3
            ? subDays(now, 3)
            : plan.billingInterval === "MONTHLY"
              ? addDays(now, 12 + (index % 4) * 4)
              : null,
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

    const introMemberships = clients.slice(14).map((item, index) => {
      const plan = plans[3];
      const startDate = subDays(now, 2 + index * 5);

      return {
        id: cuid(),
        clientId: item.id,
        name: plan.name,
        status: index === 3 ? ("CANCELLED" as const) : ("ACTIVE" as const),
        startDate,
        endDate: index === 3 ? subDays(now, 3) : addDays(startDate, 14),
        price: plan.price,
        currency: "USD",
        planId: plan.id,
        organizationId: orgId,
        locationId,
        autoRenew: false,
        createdAt: startDate,
        updatedAt: now,
      };
    });

    memberships.push(...introMemberships);

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

    const historicalClasses = Array.from({ length: 28 }, (_, index) => {
      const classStart = setMinutes(
        setHours(subDays(today, Math.floor(index / 4) + 1), 7 + (index % 4) * 3),
        index % 2 === 0 ? 0 : 30
      );
      const type = classTypes[(index + 2) % classTypes.length];
      const teacher = instructors[(index + 1) % instructors.length];
      const studioRoom = rooms[(index + 1) % rooms.length];
      const capacity = studioRoom.capacity ?? 20;

      return {
        id: cuid(),
        name: type.name,
        description: `${type.name} completed demo class`,
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
        bookedCount: Math.min(6 + (index % 9), capacity),
        status: "COMPLETED" as const,
        color: type.color,
        isRecurring: false,
        isVirtual: false,
        createdAt: classStart,
        updatedAt: now,
      };
    });

    const seededClasses = [...historicalClasses, ...classes];

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

    const historicalBookings = historicalClasses.flatMap((classItem, classIndex) =>
      clients
        .slice(0, Math.min(classItem.bookedCount, clients.length))
        .map((member, index) => {
          const noShow = classIndex % 6 === 0 && index === classIndex % 3;

          return {
            id: randomUUID(),
            classId: classItem.id,
            clientId: member.id,
            status: noShow ? ("NO_SHOW" as const) : ("ATTENDED" as const),
            bookedAt: subDays(classItem.startTime, (index % 5) + 1),
            checkedInAt: noShow ? null : classItem.startTime,
            createdAt: subDays(classItem.startTime, (index % 5) + 1),
            updatedAt: now,
          };
        })
    );

    const seededBookings = [...historicalBookings, ...bookings];

    const checkIns = seededBookings
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

    const waitlistRows = classes.slice(0, 3).flatMap((classItem, classIndex) =>
      clients.slice(14 + classIndex, 17 + classIndex).map((member, index) => ({
        id: cuid(),
        classId: classItem.id,
        clientId: member.id,
        position: index + 1,
        joinedAt: subDays(now, index + 1),
        status: "WAITING" as const,
        createdAt: subDays(now, index + 1),
        updatedAt: now,
      }))
    );

    const products = [
      {
        id: cuid(),
        name: "Grip Socks",
        type: "RETAIL" as const,
        category: "Retail",
        price: "18.00",
      },
      {
        id: cuid(),
        name: "Hydration Bottle",
        type: "RETAIL" as const,
        category: "Retail",
        price: "24.00",
      },
      {
        id: cuid(),
        name: "10-Class Product",
        type: "CLASS_PACK" as const,
        category: "Class packs",
        price: "180.00",
      },
      {
        id: cuid(),
        name: "Unlimited Membership Product",
        type: "MEMBERSHIP_PLAN" as const,
        category: "Memberships",
        price: "149.00",
      },
      {
        id: cuid(),
        name: "Single Class Fee",
        type: "FEE" as const,
        category: "Drop-ins",
        price: "25.00",
      },
    ];

    const payments = Array.from({ length: 44 }, (_, index) => {
      const previousRange = index >= 30;
      const createdAt = subDays(now, previousRange ? 32 + (index - 30) * 2 : index % 29);
      const paymentType =
        index % 5 === 0
          ? ("POS" as const)
          : index % 4 === 0
            ? ("CLASS_PACK" as const)
            : index % 7 === 0
              ? ("DROP_IN" as const)
              : ("MEMBERSHIP" as const);
      const membership = paymentType === "MEMBERSHIP" ? memberships[index % memberships.length] : null;
      const plan = membership ? plans.find((item) => item.id === membership.planId) : null;
      const product =
        paymentType === "POS"
          ? products[index % 2]
          : paymentType === "CLASS_PACK"
            ? products[2]
            : paymentType === "MEMBERSHIP"
              ? products[3]
              : products[4];
      const amount =
        paymentType === "MEMBERSHIP"
          ? plan?.price ?? "149.00"
          : paymentType === "CLASS_PACK"
            ? "180.00"
            : paymentType === "DROP_IN"
              ? "25.00"
              : product?.price ?? "18.00";

      return {
        id: cuid(),
        organizationId: orgId,
        locationId,
        clientId: membership?.clientId ?? clients[index % clients.length].id,
        membershipId: membership?.id ?? null,
        productId: product?.id ?? null,
        paymentMethod: index % 3 === 0 ? "Card" : "Mindbody import",
        amount,
        currency: "USD",
        status: "SUCCEEDED" as const,
        type: paymentType,
        description: `${paymentType.replaceAll("_", " ")} demo payment`,
        metadata: demoMetadata(),
        createdAt,
        updatedAt: now,
      };
    });

    const paymentLineItems = payments.map((payment, index) => {
      const product =
        payment.type === "POS"
          ? products[index % 2]
          : payment.type === "CLASS_PACK"
            ? products[2]
            : payment.type === "MEMBERSHIP"
              ? products[3]
              : products[4];

      return {
        id: cuid(),
        organizationId: orgId,
        locationId,
        paymentId: payment.id,
        clientId: payment.clientId,
        productId: product?.id ?? null,
        description: payment.description,
        category: product?.category ?? payment.type.replaceAll("_", " "),
        quantity: 1,
        unitPrice: payment.amount,
        amount: payment.amount,
        currency: "USD",
        soldAt: payment.createdAt,
        metadata: demoMetadata(),
        createdAt: payment.createdAt,
        updatedAt: now,
      };
    });

    const payouts = Array.from({ length: 8 }, (_, index) => {
      const periodEnd = subDays(now, index * 7 + 1);
      const periodStart = subDays(periodEnd, 6);

      return {
        id: cuid(),
        instructorId: instructors[index % instructors.length].id,
        organizationId: orgId,
        locationId,
        amount: String(120 + index * 18),
        currency: "USD",
        status: index < 5 ? ("PAID" as const) : ("PROCESSING" as const),
        periodStart,
        periodEnd,
        classesCount: 4 + (index % 4),
        notes: "Demo class payroll",
        paidAt: index < 5 ? periodEnd : null,
        createdAt: periodEnd,
        updatedAt: now,
      };
    });

    const referralProgramRow = {
      id: cuid(),
      organizationId: orgId,
      name: "Demo referral rewards",
      referrerRewardValue: "15.00",
      refereeRewardValue: "10.00",
      currency: "USD",
      createdAt: now,
      updatedAt: now,
    };

    const referralRows = clients.slice(0, 4).map((member, index) => ({
      id: cuid(),
      programId: referralProgramRow.id,
      referrerClientId: member.id,
      refereeClientId: clients[14 + index]?.id ?? null,
      refereeEmail: clients[14 + index]?.email ?? `referral${index + 1}@demo.studio`,
      code: `DEMO-REF-${randomUUID().slice(0, 8)}`,
      status: index % 2 === 0 ? ("CONVERTED" as const) : ("SIGNED_UP" as const),
      convertedAt: subDays(now, 3 + index * 4),
      expiresAt: addDays(now, 30),
      createdAt: subDays(now, 4 + index * 4),
    }));

    const automationEvents = payments.slice(0, 18).map((payment, index) => {
      const types = [
        "MEMBERSHIP_SIGNUP",
        "LEAD_CONVERTED",
        "INTRO_OFFER_COMPLETED",
        "PAYMENT_SUCCEEDED",
      ] as const;

      return {
        id: cuid(),
        organizationId: orgId,
        locationId,
        clientId: payment.clientId,
        type: types[index % types.length],
        name: index % 2 === 0 ? "New member welcome flow" : "Intro follow-up flow",
        entityType: "studioPayment",
        entityId: payment.id,
        value: index % 4 === 3 ? payment.amount : null,
        metadata: demoMetadata(),
        occurredAt: payment.createdAt,
        createdAt: payment.createdAt,
      };
    });

    const campaigns = [
      {
        id: cuid(),
        organizationId: orgId,
        locationId,
        name: "Demo spring reactivation",
        status: "SENT" as const,
        subject: "Ready for your next class?",
        content: demoMetadata(),
        totalRecipients: 240,
        delivered: 233,
        opened: 145,
        clicked: 38,
        sentAt: subDays(now, 6),
        createdAt: subDays(now, 7),
        updatedAt: now,
      },
      {
        id: cuid(),
        organizationId: orgId,
        locationId,
        name: "Demo intro offer follow-up",
        status: "SENT" as const,
        subject: "Keep your momentum going",
        content: demoMetadata(),
        totalRecipients: 84,
        delivered: 82,
        opened: 57,
        clicked: 21,
        sentAt: subDays(now, 13),
        createdAt: subDays(now, 14),
        updatedAt: now,
      },
    ];

    const activityRows = [
      ...clients.slice(0, 4).map((member, index) => ({
        id: cuid(),
        organizationId: orgId,
        locationId,
        userId: ctx.auth.user.id,
        type: "CLIENT" as const,
        action: "CREATED" as const,
        entityType: "client",
        entityId: member.id,
        entityName: member.name,
        metadata: demoMetadata(),
        createdAt: subDays(now, index + 1),
      })),
      ...classes.slice(0, 2).map((classItem, index) => ({
        id: cuid(),
        organizationId: orgId,
        locationId,
        userId: ctx.auth.user.id,
        type: "BOOKING" as const,
        action: "CREATED" as const,
        entityType: "studioClass",
        entityId: classItem.id,
        entityName: classItem.name,
        metadata: demoMetadata(),
        createdAt: subDays(now, index + 1),
      })),
      ...campaigns.map((campaignRow, index) => ({
        id: cuid(),
        organizationId: orgId,
        locationId,
        userId: ctx.auth.user.id,
        type: "CAMPAIGN" as const,
        action: "COMPLETED" as const,
        entityType: "campaign",
        entityId: campaignRow.id,
        entityName: campaignRow.name,
        metadata: demoMetadata(),
        createdAt: subDays(now, index + 2),
      })),
    ];
    const result = await db.transaction(async (tx) => {
      const existingClasses = await tx.query.studioClass.findMany({
        where: and(
          eq(studioClass.organizationId, orgId),
          locationFilter(studioClass.locationId, locationId)
        ),
        columns: { id: true },
      });
      const classIds = existingClasses.map((item) => item.id);

      if (classIds.length > 0) {
        await tx.delete(classWaitlist).where(inArray(classWaitlist.classId, classIds));
        await tx.delete(checkIn).where(inArray(checkIn.classId, classIds));
        await tx.delete(studioBooking).where(inArray(studioBooking.classId, classIds));
      }

      const existingMemberships = await tx.query.studioMembership.findMany({
        where: and(
          eq(studioMembership.organizationId, orgId),
          locationFilter(studioMembership.locationId, locationId)
        ),
        columns: { id: true },
      });
      const membershipIds = existingMemberships.map((item) => item.id);
      if (membershipIds.length > 0) {
        await tx.delete(classCredit).where(inArray(classCredit.membershipId, membershipIds));
      }

      await tx.delete(studioPaymentLineItem).where(
        and(
          eq(studioPaymentLineItem.organizationId, orgId),
          locationFilter(studioPaymentLineItem.locationId, locationId)
        )
      );
      await tx.delete(studioPayment).where(
        and(
          eq(studioPayment.organizationId, orgId),
          locationFilter(studioPayment.locationId, locationId)
        )
      );
      await tx.delete(automationEvent).where(
        and(
          eq(automationEvent.organizationId, orgId),
          locationFilter(automationEvent.locationId, locationId)
        )
      );
      await tx.delete(campaign).where(
        and(
          eq(campaign.organizationId, orgId),
          locationFilter(campaign.locationId, locationId)
        )
      );
      await tx.delete(activity).where(
        and(
          eq(activity.organizationId, orgId),
          locationFilter(activity.locationId, locationId)
        )
      );
      await tx.delete(instructorPayout).where(
        and(
          eq(instructorPayout.organizationId, orgId),
          locationFilter(instructorPayout.locationId, locationId)
        )
      );
      await tx.delete(studioMembership).where(
        and(
          eq(studioMembership.organizationId, orgId),
          locationFilter(studioMembership.locationId, locationId)
        )
      );
      await tx.delete(studioClass).where(
        and(
          eq(studioClass.organizationId, orgId),
          locationFilter(studioClass.locationId, locationId)
        )
      );
      await tx.delete(client).where(
        and(eq(client.organizationId, orgId), locationFilter(client.locationId, locationId))
      );
      await tx.delete(instructor).where(
        and(
          eq(instructor.organizationId, orgId),
          locationFilter(instructor.locationId, locationId)
        )
      );
      await tx.delete(room).where(
        and(eq(room.organizationId, orgId), locationFilter(room.locationId, locationId))
      );
      await tx.delete(classType).where(
        and(
          eq(classType.organizationId, orgId),
          locationFilter(classType.locationId, locationId)
        )
      );
      await tx.delete(membershipPlan).where(
        and(
          eq(membershipPlan.organizationId, orgId),
          locationFilter(membershipPlan.locationId, locationId)
        )
      );
      await tx.delete(studioProduct).where(
        and(
          eq(studioProduct.organizationId, orgId),
          locationFilter(studioProduct.locationId, locationId)
        )
      );

      await tx.insert(room).values(
        rooms.map((item) => ({
          ...item,
          organizationId: orgId,
          locationId,
          createdAt: now,
          updatedAt: now,
        }))
      );
      await tx.insert(classType).values(
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
      await tx.insert(instructor).values(
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
      await tx.insert(membershipPlan).values(
        plans.map((item, index) => ({
          ...item,
          description: `${item.name} demo plan`,
          organizationId: orgId,
          locationId,
          currency: "USD",
          sortOrder: index,
          isActive: true,
          isPublic: true,
          isIntroOffer: item.isIntroOffer ?? false,
          createdAt: now,
          updatedAt: now,
        }))
      );
      await tx.insert(client).values(clients);
      await tx.insert(studioProduct).values(
        products.map((item) => ({
          ...item,
          organizationId: orgId,
          locationId,
          currency: "USD",
          isActive: true,
          isPublic: true,
          metadata: demoMetadata(),
          createdAt: now,
          updatedAt: now,
        }))
      );
      await tx.insert(studioMembership).values(memberships);
      if (creditRows.length > 0) {
        await tx.insert(classCredit).values(creditRows);
      }
      await tx.insert(studioClass).values(seededClasses);
      await tx.insert(studioBooking).values(seededBookings);
      if (checkIns.length > 0) {
        await tx.insert(checkIn).values(checkIns);
      }
      await tx.insert(classWaitlist).values(waitlistRows);
      await tx.insert(studioPayment).values(payments);
      await tx.insert(studioPaymentLineItem).values(paymentLineItems);
      await tx.insert(instructorPayout).values(payouts);
      const existingReferralProgram = await tx.query.referralProgram.findFirst({
        where: eq(referralProgram.organizationId, orgId),
        columns: { id: true },
      });
      const referralProgramId = existingReferralProgram?.id ?? referralProgramRow.id;
      if (!existingReferralProgram) {
        await tx.insert(referralProgram).values(referralProgramRow);
      }
      await tx.insert(referral).values(
        referralRows.map((item) => ({
          ...item,
          programId: referralProgramId,
        }))
      );
      await tx.insert(automationEvent).values(automationEvents);
      await tx.insert(campaign).values(campaigns);
      await tx.insert(activity).values(activityRows);

      return {
        success: true,
        counts: {
          rooms: rooms.length,
          classTypes: classTypes.length,
          instructors: instructors.length,
          clients: clients.length,
          memberships: memberships.length,
          classes: seededClasses.length,
          bookings: seededBookings.length,
          checkIns: checkIns.length,
          waitlistEntries: waitlistRows.length,
          products: products.length,
          payments: payments.length,
          paymentLineItems: paymentLineItems.length,
          payouts: payouts.length,
          referrals: referralRows.length,
          automationEvents: automationEvents.length,
          campaigns: campaigns.length,
          activities: activityRows.length,
        },
      };
    });

    await deleteRedisCacheMatching([
      `studio-dashboard:v1:*:${orgId}:${locationId ?? "organization"}*`,
      `revenue:v1:overview:${orgId}:${locationId ?? "organization"}:*`,
    ]);

    return result;
  }),
});
