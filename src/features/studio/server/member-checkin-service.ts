import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  checkIn,
  client,
  introOffer,
  introOfferRedemption,
  studioBooking,
  studioClass,
} from "@/db/schema";

export type MemberCheckInMethod =
  | "QR_CODE"
  | "NFC"
  | "KIOSK"
  | "GEO"
  | "MANUAL"
  | "PIN";

export type IntroOfferUsage = {
  id: string;
  offerId: string;
  offerName: string;
  classesUsed: number;
  classCredits: number | null;
  completed: boolean;
  status: string;
};

const clientProjection = {
  id: client.id,
  name: client.name,
  email: client.email,
  phone: client.phone,
  tags: client.tags,
  acquisitionStage: client.acquisitionStage,
  attendanceCount: client.attendanceCount,
  currentStreak: client.currentStreak,
};

function exactLocation(column: AnyPgColumn, locationId: string | null) {
  return locationId === null ? isNull(column) : eq(column, locationId);
}

export async function performMemberCheckIn(input: {
  actorUserId: string;
  organizationId: string;
  activeLocationId: string | null;
  classId: string;
  clientId: string;
  method: MemberCheckInMethod;
}) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const [targetClass] = await tx
      .select({
        id: studioClass.id,
        name: studioClass.name,
        startTime: studioClass.startTime,
        endTime: studioClass.endTime,
        status: studioClass.status,
        classTypeId: studioClass.classTypeId,
        locationId: studioClass.locationId,
      })
      .from(studioClass)
      .where(
        and(
          eq(studioClass.id, input.classId),
          eq(studioClass.organizationId, input.organizationId),
          input.activeLocationId
            ? eq(studioClass.locationId, input.activeLocationId)
            : undefined,
        ),
      )
      .limit(1);
    if (!targetClass) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Class not found" });
    }
    if (
      targetClass.status === "CANCELLED" ||
      targetClass.status === "COMPLETED" ||
      targetClass.endTime <= now
    ) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Check-in is closed for this class.",
      });
    }

    const [targetClient] = await tx
      .select(clientProjection)
      .from(client)
      .where(
        and(
          eq(client.id, input.clientId),
          eq(client.organizationId, input.organizationId),
          exactLocation(client.locationId, targetClass.locationId),
        ),
      )
      .limit(1);
    if (!targetClient) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
    }

    const [booking] = await tx
      .select({ id: studioBooking.id, status: studioBooking.status })
      .from(studioBooking)
      .where(
        and(
          eq(studioBooking.classId, input.classId),
          eq(studioBooking.clientId, input.clientId),
        ),
      )
      .limit(1);
    if (booking && booking.status !== "BOOKED") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "This booking is not eligible for check-in.",
      });
    }

    const [createdCheckIn] = await tx
      .insert(checkIn)
      .values({
        id: randomUUID(),
        clientId: input.clientId,
        classId: input.classId,
        method: input.method,
        checkedInAt: now,
        checkedInBy: input.actorUserId,
        isLateArrival: now > targetClass.startTime,
        organizationId: input.organizationId,
        locationId: targetClass.locationId,
        createdAt: now,
      })
      .onConflictDoNothing({ target: [checkIn.classId, checkIn.clientId] })
      .returning();
    if (!createdCheckIn) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This member is already checked in.",
      });
    }

    const [updatedClient] = await tx
      .update(client)
      .set({
        attendanceCount: sql`${client.attendanceCount} + 1`,
        currentStreak: sql`${client.currentStreak} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(client.id, input.clientId),
          eq(client.organizationId, input.organizationId),
          exactLocation(client.locationId, targetClass.locationId),
        ),
      )
      .returning(clientProjection);
    if (!updatedClient) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update member attendance.",
      });
    }

    if (booking) {
      await tx
        .update(studioBooking)
        .set({ checkedInAt: now, status: "ATTENDED", updatedAt: now })
        .where(eq(studioBooking.id, booking.id));
    }

    const scopedOffers = await tx
      .select({
        id: introOfferRedemption.id,
        offerId: introOffer.id,
        offerName: introOffer.name,
        classesUsed: introOfferRedemption.classesUsed,
        classCredits: introOffer.classCredits,
        allowedClassTypes: introOffer.allowedClassTypes,
      })
      .from(introOfferRedemption)
      .innerJoin(introOffer, eq(introOffer.id, introOfferRedemption.offerId))
      .where(
        and(
          eq(introOfferRedemption.clientId, input.clientId),
          eq(introOfferRedemption.status, "ACTIVE"),
          gte(introOfferRedemption.expiresAt, now),
          eq(introOffer.organizationId, input.organizationId),
          exactLocation(introOffer.locationId, targetClass.locationId),
        ),
      );
    const activeOffers = scopedOffers.filter(
      (offer) =>
        !offer.allowedClassTypes?.length ||
        Boolean(
          targetClass.classTypeId &&
            offer.allowedClassTypes.includes(targetClass.classTypeId),
        ),
    );
    const offerIds = activeOffers.map((offer) => offer.id);
    const updatedOffers = offerIds.length
      ? await tx
          .update(introOfferRedemption)
          .set({ classesUsed: sql`${introOfferRedemption.classesUsed} + 1` })
          .where(inArray(introOfferRedemption.id, offerIds))
          .returning({
            id: introOfferRedemption.id,
            classesUsed: introOfferRedemption.classesUsed,
            status: introOfferRedemption.status,
          })
      : [];
    const updatedOfferById = new Map(
      updatedOffers.map((offer) => [offer.id, offer]),
    );
    const completedOfferIds = activeOffers
      .filter((offer) => {
        const updated = updatedOfferById.get(offer.id);
        return Boolean(
          updated &&
            offer.classCredits !== null &&
            offer.classesUsed < offer.classCredits &&
            updated.classesUsed >= offer.classCredits,
        );
      })
      .map((offer) => offer.id);

    const introOffers: IntroOfferUsage[] = activeOffers.flatMap((offer) => {
      const updated = updatedOfferById.get(offer.id);
      if (!updated) return [];
      const completed = completedOfferIds.includes(offer.id);
      return [
        {
          ...offer,
          classesUsed: updated.classesUsed,
          completed,
          status: updated.status,
        },
      ];
    });

    return {
      checkInRecord: createdCheckIn,
      client: updatedClient,
      studioClass: targetClass,
      introOffers,
    };
  });
}
