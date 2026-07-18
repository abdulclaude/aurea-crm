import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  ilike,
  isNull,
  lt,
  lte,
  or,
} from "drizzle-orm";
import { z } from "zod";

import { ActivityAction } from "@/db/enums";
import { db } from "@/db";
import {
  booking,
  bookingAvailability,
  bookingEventType,
  bookingHoliday,
  client,
  deal,
  stripeConnection,
} from "@/db/schema";
import { getCalComClient } from "@/lib/calcom";
import { logAnalytics } from "@/lib/analytics-logger";
import { createNotification } from "@/lib/notifications";
import { createStripeCheckoutSessionForBooking } from "@/features/bookings/server/stripe-checkout";
import {
  attachStripeCheckoutToOperation,
  createOrReuseCheckoutOperation,
  failCommerceOperation,
} from "@/features/commerce/server/operations";
import {
  currencyExponent,
  decimalToMinorUnits,
  minorUnitsToDecimal,
  normalizeCurrency,
} from "@/features/commerce/lib/money";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { BOOKING_PAGE_SIZE } from "../constants";
import { requireActiveCalComCredential } from "./calcom-scope";
import { requireCapability } from "@/features/permissions/server/authorization";
import {
  bookingFitsBusinessHours,
  guestBookingPolicyError,
} from "@/features/workspace-settings/lib/booking-operations-policy";
import { getEffectiveWorkspaceOperationsValues } from "@/features/workspace-settings/server/operations-query-service";
import { getEffectiveWorkspaceRegionalValues } from "@/features/workspace-settings/server/query-service";

const bookingStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "RESCHEDULED",
  "NO_SHOW",
  "COMPLETED",
]);

const BOOKING_PAYMENT_HOLD_MS = 60 * 60 * 1000;
const STRIPE_MIN_CHECKOUT_LIFETIME_MS = 30 * 60 * 1000;

const bookingWithRelations = {
  bookingEventType: true,
  client: {
    columns: {
      id: true,
      name: true,
      email: true,
      phone: true,
      companyName: true,
    },
  },
  deal: {
    columns: {
      id: true,
      name: true,
      value: true,
      currency: true,
    },
  },
} as const;

function requireOrgAndLocation(ctx: {
  orgId: string | null;
  locationId: string | null;
}) {
  if (!ctx.orgId || !ctx.locationId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Please select a location to manage bookings",
    });
  }
  return { organizationId: ctx.orgId, locationId: ctx.locationId };
}

async function requireScheduleManagement(
  ctx: { auth: { user: { id: string } } },
  scope: { organizationId: string; locationId: string },
) {
  await requireCapability({
    actor: {
      userId: ctx.auth.user.id,
      organizationId: scope.organizationId,
      locationId: scope.locationId,
    },
    capability: "schedule.manage",
    resource: scope,
  });
}

function mapBooking<T extends { bookingEventType?: unknown }>(
  row: T,
): Omit<T, "bookingEventType"> & { eventType: T["bookingEventType"] } {
  const { bookingEventType: eventType, ...rest } = row;
  return { ...rest, eventType };
}

function metadataRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function metadataString(value: unknown, key: string): string | null {
  const candidate = metadataRecord(value)?.[key];
  return typeof candidate === "string" && candidate.length > 0
    ? candidate
    : null;
}

const resolveBookingPricing = (
  eventType: {
    requiresPayment: boolean;
    price: string | null;
    currency: string | null;
    metadata: unknown;
  },
  duration: number,
) => {
  if (!eventType.requiresPayment) {
    return { amount: null, currency: null };
  }

  const pricing = metadataRecord(eventType.metadata)?.pricing;
  const currency = eventType.currency || "USD";

  if (metadataRecord(pricing)?.model === "duration") {
    const durationPricing = metadataRecord(pricing)?.durationPricing;
    const match = Array.isArray(durationPricing)
      ? durationPricing.find(
          (entry): entry is { duration: number; price: number } =>
            metadataRecord(entry)?.duration === duration &&
            typeof metadataRecord(entry)?.price === "number",
        )
      : null;

    if (!match) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No pricing found for the selected duration.",
      });
    }

    return { amount: String(match.price), currency };
  }

  if (eventType.price === null || eventType.price === undefined) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This event type requires payment but no price is configured.",
    });
  }

  return { amount: eventType.price, currency };
};

function bookingApplicationFeeMinor(input: {
  amountMinor: number;
  currencyExponent: number;
  percent: string | null;
  fixed: string | null;
}): number | undefined {
  let basisPoints: number;
  let fixedMinor: number;
  try {
    basisPoints = decimalToMinorUnits(input.percent ?? "0", 2);
    fixedMinor = decimalToMinorUnits(
      input.fixed ?? "0",
      input.currencyExponent,
    );
  } catch {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The Stripe application fee configuration is invalid.",
    });
  }
  if (basisPoints < 0 || basisPoints > 10_000 || fixedMinor < 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The Stripe application fee configuration is invalid.",
    });
  }

  const percentMinor =
    Math.trunc(input.amountMinor / 10_000) * basisPoints +
    Math.round(((input.amountMinor % 10_000) * basisPoints) / 10_000);
  const total = percentMinor + fixedMinor;
  if (!Number.isSafeInteger(total) || total < 0 || total >= input.amountMinor) {
    if (total === 0) return undefined;
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The Stripe application fee must be lower than the charge.",
    });
  }
  return total > 0 ? total : undefined;
}

async function getBookingForScope({
  id,
  organizationId,
  locationId,
}: {
  id: string;
  organizationId: string;
  locationId: string;
}) {
  const row = await db.query.booking.findFirst({
    where: and(
      eq(booking.id, id),
      eq(booking.organizationId, organizationId),
      eq(booking.locationId, locationId),
    ),
    with: bookingWithRelations,
  });

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
  }

  return mapBooking(row);
}

export const bookingsRouter = createTRPCRouter({
  getMany: protectedProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(BOOKING_PAGE_SIZE),
        status: bookingStatusSchema.optional(),
        eventTypeId: z.string().optional(),
        clientId: z.string().optional(),
        dealId: z.string().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireOrgAndLocation(ctx);
      const conditions = [
        eq(booking.organizationId, organizationId),
        eq(booking.locationId, locationId),
      ];

      if (input.status) conditions.push(eq(booking.status, input.status));
      if (input.eventTypeId)
        conditions.push(eq(booking.eventTypeId, input.eventTypeId));
      if (input.clientId) conditions.push(eq(booking.clientId, input.clientId));
      if (input.dealId) conditions.push(eq(booking.dealId, input.dealId));
      if (input.cursor) conditions.push(lt(booking.id, input.cursor));
      if (input.search) {
        conditions.push(
          or(
            ilike(booking.title, `%${input.search}%`),
            ilike(booking.attendeeName, `%${input.search}%`),
            ilike(booking.attendeeEmail, `%${input.search}%`),
          )!,
        );
      }

      const rows = await db.query.booking.findMany({
        where: and(...conditions),
        with: bookingWithRelations,
        orderBy: desc(booking.startTime),
        limit: input.limit + 1,
      });

      let nextCursor: string | undefined;
      if (rows.length > input.limit) {
        const nextItem = rows.pop();
        nextCursor = nextItem?.id;
      }

      return {
        bookings: rows.map(mapBooking),
        nextCursor,
      };
    }),

  getCalendar: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        eventTypeId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireOrgAndLocation(ctx);
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId,
          locationId,
        },
        capability: "schedule.view",
        resource: { organizationId, locationId },
      });

      const bookings = await db.query.booking.findMany({
        where: and(
          eq(booking.organizationId, organizationId),
          eq(booking.locationId, locationId),
          input.eventTypeId
            ? eq(booking.eventTypeId, input.eventTypeId)
            : undefined,
          lte(booking.startTime, input.endDate),
          gte(booking.endTime, input.startDate),
        ),
        with: { bookingEventType: { columns: { title: true } } },
        orderBy: asc(booking.startTime),
      });

      const availabilityBlocks = await db.query.bookingAvailability.findMany({
        where: and(
          eq(bookingAvailability.organizationId, organizationId),
          eq(bookingAvailability.locationId, locationId),
          lte(bookingAvailability.startTime, input.endDate),
          gte(bookingAvailability.endTime, input.startDate),
        ),
        orderBy: asc(bookingAvailability.startTime),
      });

      const holidays = await db.query.bookingHoliday.findMany({
        where: and(
          eq(bookingHoliday.organizationId, organizationId),
          eq(bookingHoliday.locationId, locationId),
          lte(bookingHoliday.startDate, input.endDate),
          gte(bookingHoliday.endDate, input.startDate),
        ),
        orderBy: asc(bookingHoliday.startDate),
      });

      return {
        bookings: bookings.map((item) => ({
          policyStatus: metadataString(
            metadataRecord(item.metadata)?.policyEvaluation,
            "status",
          ),
          id: item.id,
          title: item.title,
          status: item.status,
          startTime: item.startTime,
          endTime: item.endTime,
          attendeeName: item.attendeeName,
          attendeeEmail: item.attendeeEmail,
          eventTypeTitle: item.bookingEventType?.title ?? "",
        })),
        availabilityBlocks: availabilityBlocks.map((block) => ({
          id: block.id,
          title: block.title,
          startTime: block.startTime,
          endTime: block.endTime,
        })),
        holidayBlocks: holidays.map((holiday) => ({
          id: holiday.id,
          name: holiday.name,
          startDate: holiday.startDate,
          endDate: holiday.endDate,
        })),
      };
    }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) =>
      getBookingForScope({ id: input.id, ...requireOrgAndLocation(ctx) }),
    ),

  create: protectedProcedure
    .input(
      z.object({
        eventTypeId: z.string(),
        clientId: z.string().optional(),
        dealId: z.string().optional(),
        attendeeName: z.string().min(1),
        attendeeEmail: z.string().email(),
        attendeePhone: z.string().optional(),
        attendeeTimezone: z.string().default("UTC"),
        startTime: z.string().datetime(),
        duration: z.number().min(1),
        locationType: z.enum([
          "CAL_VIDEO",
          "PHONE",
          "IN_PERSON",
          "GOOGLE_MEET",
          "ZOOM",
          "MS_TEAMS",
          "CUSTOM",
        ]),
        locationValue: z.string().optional(),
        additionalNotes: z.string().optional(),
        guests: z.array(z.string().email()).optional(),
        customFieldsResponses: z.record(z.string(), z.unknown()).optional(),
        syncToCalCom: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireOrgAndLocation(ctx);
      await requireScheduleManagement(ctx, { organizationId, locationId });
      const startTime = new Date(input.startTime);
      const endTime = new Date(input.startTime);
      endTime.setMinutes(endTime.getMinutes() + input.duration);

      const eventType = await db.query.bookingEventType.findFirst({
        where: and(
          eq(bookingEventType.id, input.eventTypeId),
          eq(bookingEventType.organizationId, organizationId),
          eq(bookingEventType.locationId, locationId),
        ),
      });
      if (!eventType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event type not found",
        });
      }

      const scope = { organizationId, locationId };
      const [operationsSettings, regionalSettings] = await Promise.all([
        getEffectiveWorkspaceOperationsValues(scope),
        getEffectiveWorkspaceRegionalValues(scope),
      ]);
      const guestPolicyError = guestBookingPolicyError({
        guestCount: input.guests?.length ?? 0,
        settings: operationsSettings,
      });
      if (guestPolicyError) {
        throw new TRPCError({ code: "BAD_REQUEST", message: guestPolicyError });
      }
      if (
        !bookingFitsBusinessHours({
          start: startTime,
          end: endTime,
          timezone: regionalSettings.timezone,
          businessHours: operationsSettings.businessHours,
        })
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This booking falls outside the workspace business hours.",
        });
      }

      if (input.clientId) {
        const existingClient = await db.query.client.findFirst({
          where: and(
            eq(client.id, input.clientId),
            eq(client.organizationId, organizationId),
            eq(client.locationId, locationId),
          ),
        });
        if (!existingClient) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
      }

      if (input.dealId) {
        const existingDeal = await db.query.deal.findFirst({
          where: and(
            eq(deal.id, input.dealId),
            eq(deal.organizationId, organizationId),
            eq(deal.locationId, locationId),
          ),
        });
        if (!existingDeal) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
        }
      }

      const [availabilityBlock, holidayBlock] = await Promise.all([
        db.query.bookingAvailability.findFirst({
          where: and(
            eq(bookingAvailability.organizationId, organizationId),
            eq(bookingAvailability.locationId, locationId),
            lt(bookingAvailability.startTime, endTime),
            gt(bookingAvailability.endTime, startTime),
          ),
        }),
        db.query.bookingHoliday.findFirst({
          where: and(
            eq(bookingHoliday.organizationId, organizationId),
            eq(bookingHoliday.locationId, locationId),
            lt(bookingHoliday.startDate, endTime),
            gt(bookingHoliday.endDate, startTime),
          ),
        }),
      ]);

      if (availabilityBlock) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This time is blocked by an availability rule.",
        });
      }
      if (holidayBlock) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This time falls on a holiday block.",
        });
      }

      const pricing = resolveBookingPricing(eventType, input.duration);
      const paymentRequired =
        pricing.amount !== null && pricing.currency !== null;
      const now = new Date();
      const bookingId = randomUUID();
      const holdExpiresAt = paymentRequired
        ? new Date(now.getTime() + BOOKING_PAYMENT_HOLD_MS)
        : null;

      if (paymentRequired) {
        const paymentConnection = await db.query.stripeConnection.findFirst({
          where: and(
            eq(stripeConnection.organizationId, organizationId),
            eq(stripeConnection.locationId, locationId),
            eq(stripeConnection.isActive, true),
            eq(stripeConnection.chargesEnabled, true),
          ),
          columns: { accountType: true },
        });
        if (!paymentConnection || paymentConnection.accountType !== "express") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Complete Stripe Express onboarding for this location before creating paid bookings.",
          });
        }
      }

      await db.insert(booking).values({
        id: bookingId,
        organizationId,
        locationId,
        eventTypeId: input.eventTypeId,
        clientId: input.clientId,
        dealId: input.dealId,
        title: eventType.title,
        description: eventType.description,
        status: paymentRequired ? "PENDING" : "CONFIRMED",
        paymentStatus: paymentRequired ? "REQUIRES_PAYMENT" : "NOT_REQUIRED",
        holdExpiresAt,
        paymentRequiredAt: paymentRequired ? now : null,
        confirmedAt: paymentRequired ? null : now,
        attendeeName: input.attendeeName,
        attendeeEmail: input.attendeeEmail,
        attendeePhone: input.attendeePhone,
        attendeeTimezone: input.attendeeTimezone,
        additionalNotes: input.additionalNotes,
        guests: input.guests ?? [],
        startTime,
        endTime,
        duration: input.duration,
        locationType: input.locationType,
        locationValue: input.locationValue,
        customFieldsResponses: input.customFieldsResponses,
        amount: pricing.amount,
        currency: pricing.currency,
        createdAt: now,
        updatedAt: now,
      });

      let calComBooking: unknown = null;
      let calComCredentialId: string | null = null;

      try {
        if (!input.syncToCalCom) {
          calComBooking = null;
        } else {
          if (!eventType.calEventTypeId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "This event type is not synced to Cal.com yet.",
            });
          }

          const credential = await requireActiveCalComCredential({
            organizationId,
            locationId,
          });
          if (eventType.calComCredentialId !== credential.id) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message:
                "This event type belongs to a different Cal.com connection.",
            });
          }
          calComCredentialId = credential.id;
          const calClient = await getCalComClient(credential.apiKey);
          calComBooking = await calClient.createBooking({
            eventTypeId: eventType.calEventTypeId,
            start: input.startTime,
            timeZone: input.attendeeTimezone || "UTC",
            language: "en",
            guests: input.guests,
            metadata: {
              aureaCrmBooking: "true",
              ...(input.clientId ? { clientId: input.clientId } : {}),
              ...(input.dealId ? { dealId: input.dealId } : {}),
            },
            responses: {
              name: input.attendeeName,
              email: input.attendeeEmail,
              ...(input.attendeePhone ? { phone: input.attendeePhone } : {}),
              ...(input.locationValue ? { location: input.locationValue } : {}),
              ...(input.customFieldsResponses ?? {}),
            },
            lengthInMinutes: input.duration,
          });
        }
      } catch (error) {
        await db
          .update(booking)
          .set({
            status: "CANCELLED",
            paymentStatus: paymentRequired ? "EXPIRED" : "NOT_REQUIRED",
            cancelledAt: new Date(),
            cancellationReason: "Provider booking creation failed",
            releasedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(booking.id, bookingId));
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Cal.com could not create the booking.",
          cause: error,
        });
      }

      const calData =
        metadataRecord(calComBooking)?.data &&
        metadataRecord(metadataRecord(calComBooking)?.data)
          ? metadataRecord(metadataRecord(calComBooking)?.data)
          : metadataRecord(calComBooking);
      const calBookingId =
        typeof calData?.id === "number" ? calData.id : undefined;
      const calBookingUid =
        typeof calData?.uid === "string" ? calData.uid : undefined;

      if (calBookingUid) {
        const existingBooking = await db.query.booking.findFirst({
          where: and(
            eq(booking.organizationId, organizationId),
            eq(booking.locationId, locationId),
            calComCredentialId
              ? eq(booking.calComCredentialId, calComCredentialId)
              : isNull(booking.calComCredentialId),
            eq(booking.calBookingUid, calBookingUid),
          ),
          with: bookingWithRelations,
        });
        if (existingBooking) {
          await db
            .update(booking)
            .set({
              status: "CANCELLED",
              paymentStatus: paymentRequired ? "EXPIRED" : "NOT_REQUIRED",
              cancelledAt: new Date(),
              cancellationReason: "Duplicate provider booking",
              releasedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(booking.id, bookingId));
          return mapBooking(existingBooking);
        }
      }

      if (calBookingId || calBookingUid || calComCredentialId) {
        await db
          .update(booking)
          .set({
            calBookingId,
            calBookingUid,
            calComCredentialId,
            calLastEventAt: calBookingUid ? new Date() : null,
            lastSyncedAt: calBookingUid ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(booking.id, bookingId));
      }

      const created = await getBookingForScope({
        id: bookingId,
        organizationId,
        locationId,
      });

      await logAnalytics({
        organizationId,
        locationId,
        userId: ctx.auth.user.id,
        entityType: "booking",
        entityId: created.id,
        entityName: created.title,
        action: ActivityAction.CREATED,
        metadata: { status: created.status, eventTypeId: created.eventTypeId },
      });

      await createNotification({
        type: "BOOKING_CREATED",
        title: "Booking created",
        message: `${ctx.auth.user.name} created a booking for ${created.attendeeName}.`,
        actorId: ctx.auth.user.id,
        entityType: "booking",
        entityId: created.id,
        organizationId,
        locationId,
      });

      return created;
    }),

  createPaymentSession: protectedProcedure
    .input(
      z.object({
        bookingId: z.string(),
        checkoutRequestId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireOrgAndLocation(ctx);
      await requireCapability({
        actor: {
          userId: ctx.auth.user.id,
          organizationId,
          locationId,
        },
        capability: "commerce.checkout.create",
        resource: { organizationId, locationId },
      });
      const existingBooking = await getBookingForScope({
        id: input.bookingId,
        organizationId,
        locationId,
      });

      if (
        existingBooking.paid ||
        existingBooking.paymentStatus === "PAID" ||
        existingBooking.paymentStatus === "REFUNDED"
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This booking has already been paid.",
        });
      }
      if (
        !["PENDING", "CONFIRMED"].includes(existingBooking.status) ||
        existingBooking.startTime <= new Date()
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This booking can no longer accept payment.",
        });
      }
      if (
        existingBooking.holdExpiresAt &&
        existingBooking.holdExpiresAt <= new Date()
      ) {
        await db
          .update(booking)
          .set({
            status: "CANCELLED",
            paymentStatus: "EXPIRED",
            cancelledAt: new Date(),
            cancellationReason: "Payment hold expired",
            releasedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(booking.id, existingBooking.id),
              eq(booking.organizationId, organizationId),
              eq(booking.locationId, locationId),
            ),
          );
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "The payment hold has expired. Create a new booking.",
        });
      }
      if (
        existingBooking.holdExpiresAt &&
        existingBooking.holdExpiresAt.getTime() - Date.now() <
          STRIPE_MIN_CHECKOUT_LIFETIME_MS
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "This payment hold is too close to expiry. Create a new booking.",
        });
      }

      if (!existingBooking.eventType) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Booking event type is missing.",
        });
      }

      const pricing = resolveBookingPricing(
        existingBooking.eventType,
        existingBooking.duration,
      );
      if (!pricing.amount || !pricing.currency) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This booking does not require payment.",
        });
      }

      const connection = await db.query.stripeConnection.findFirst({
        where: and(
          eq(stripeConnection.organizationId, organizationId),
          eq(stripeConnection.locationId, locationId),
          eq(stripeConnection.isActive, true),
        ),
      });
      if (
        !connection ||
        !connection.chargesEnabled ||
        connection.accountType !== "express"
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Complete Stripe Express onboarding for this location.",
        });
      }

      const paymentCurrency = normalizeCurrency(pricing.currency);
      const exponent = currencyExponent(paymentCurrency);
      const amountInCents = decimalToMinorUnits(
        String(pricing.amount),
        exponent,
      );
      if (amountInCents <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid booking amount.",
        });
      }

      const applicationFeeAmount = bookingApplicationFeeMinor({
        amountMinor: amountInCents,
        currencyExponent: exponent,
        percent: connection.applicationFeePercent,
        fixed: connection.applicationFeeFixed,
      });

      const operation = await createOrReuseCheckoutOperation({
        organizationId,
        locationId,
        clientId: existingBooking.clientId,
        stripeConnectionId: connection.id,
        providerAccountId: connection.stripeAccountId,
        idempotencyKey: `stripe:booking:${organizationId}:${input.checkoutRequestId}`,
        amountMinor: amountInCents,
        currency: paymentCurrency,
        currencyExponent: exponent,
        bookingId: existingBooking.id,
        requestedBy: ctx.auth.user.id,
        expiresAt:
          existingBooking.holdExpiresAt ??
          new Date(Date.now() + BOOKING_PAYMENT_HOLD_MS),
        metadata: { checkoutKind: "BOOKING" },
      });

      const existingCheckoutUrl = metadataString(
        operation.metadata,
        "checkoutUrl",
      );
      if (operation.providerCheckoutSessionId && existingCheckoutUrl) {
        return {
          url: existingCheckoutUrl,
          sessionId: operation.providerCheckoutSessionId,
          operationId: operation.id,
        };
      }

      const checkoutExpiresAt =
        existingBooking.holdExpiresAt ??
        new Date(Date.now() + BOOKING_PAYMENT_HOLD_MS);

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const session = await createStripeCheckoutSessionForBooking({
        bookingId: existingBooking.id,
        organizationId,
        locationId,
        clientId: existingBooking.clientId,
        commerceOperationId: operation.id,
        stripeConnectionId: connection.id,
        idempotencyKey: `aurea_checkout_${operation.id}`,
        bookingTitle: existingBooking.title,
        amount: amountInCents,
        currency: paymentCurrency,
        attendeeEmail: existingBooking.attendeeEmail,
        attendeeName: existingBooking.attendeeName,
        successUrl: `${appUrl}/bookings?payment=success&bookingId=${existingBooking.id}`,
        cancelUrl: `${appUrl}/bookings?payment=cancelled&bookingId=${existingBooking.id}`,
        expiresAt: checkoutExpiresAt,
        stripeAccountId: connection.stripeAccountId,
        stripeAccountType: connection.accountType,
        applicationFeeAmount,
      });

      if (!session.success) {
        await Promise.all([
          failCommerceOperation({
            operationId: operation.id,
            code: "STRIPE_CHECKOUT_CREATE_FAILED",
            message: session.error,
          }),
          db
            .update(booking)
            .set({
              paymentStatus: "FAILED",
              paymentFailureAt: new Date(),
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(booking.id, existingBooking.id),
                eq(booking.organizationId, organizationId),
                eq(booking.locationId, locationId),
              ),
            ),
        ]);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: session.error,
        });
      }

      await attachStripeCheckoutToOperation({
        operationId: operation.id,
        checkoutSessionId: session.sessionId,
        paymentIntentId: session.paymentIntentId,
        checkoutUrl: session.url,
      });

      await db
        .update(booking)
        .set({
          amount: minorUnitsToDecimal(amountInCents, exponent),
          currency: paymentCurrency,
          paymentStatus: "PROCESSING",
          holdExpiresAt: checkoutExpiresAt,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(booking.id, existingBooking.id),
            eq(booking.organizationId, organizationId),
            eq(booking.locationId, locationId),
          ),
        );

      return {
        url: session.url,
        sessionId: session.sessionId,
        operationId: operation.id,
      };
    }),

  createAvailabilityBlock: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
        startTime: z.date(),
        endTime: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireOrgAndLocation(ctx);
      await requireScheduleManagement(ctx, { organizationId, locationId });
      const [created] = await db
        .insert(bookingAvailability)
        .values({
          id: randomUUID(),
          organizationId,
          locationId,
          title: input.title,
          startTime: input.startTime,
          endTime: input.endTime,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return created;
    }),

  updateAvailabilityBlock: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        startTime: z.date(),
        endTime: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireOrgAndLocation(ctx);
      await requireScheduleManagement(ctx, { organizationId, locationId });
      const [updated] = await db
        .update(bookingAvailability)
        .set({
          title: input.title,
          startTime: input.startTime,
          endTime: input.endTime,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(bookingAvailability.id, input.id),
            eq(bookingAvailability.organizationId, organizationId),
            eq(bookingAvailability.locationId, locationId),
          ),
        )
        .returning();
      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Availability block not found",
        });
      }
      return updated;
    }),

  deleteAvailabilityBlock: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireOrgAndLocation(ctx);
      await requireScheduleManagement(ctx, { organizationId, locationId });
      await db
        .delete(bookingAvailability)
        .where(
          and(
            eq(bookingAvailability.id, input.id),
            eq(bookingAvailability.organizationId, organizationId),
            eq(bookingAvailability.locationId, locationId),
          ),
        );
      return { success: true };
    }),

  createHoliday: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireOrgAndLocation(ctx);
      await requireScheduleManagement(ctx, { organizationId, locationId });
      const [created] = await db
        .insert(bookingHoliday)
        .values({
          id: randomUUID(),
          organizationId,
          locationId,
          name: input.name || "Holiday",
          startDate: input.startDate,
          endDate: input.endDate,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return created;
    }),

  updateHoliday: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireOrgAndLocation(ctx);
      await requireScheduleManagement(ctx, { organizationId, locationId });
      const [existing] = await db
        .select()
        .from(bookingHoliday)
        .where(
          and(
            eq(bookingHoliday.id, input.id),
            eq(bookingHoliday.organizationId, organizationId),
            eq(bookingHoliday.locationId, locationId),
          ),
        );
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Holiday not found",
        });
      }

      const [updated] = await db
        .update(bookingHoliday)
        .set({
          name: input.name ?? existing.name,
          startDate: input.startDate,
          endDate: input.endDate,
          updatedAt: new Date(),
        })
        .where(eq(bookingHoliday.id, input.id))
        .returning();
      return updated;
    }),

  deleteHoliday: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, locationId } = requireOrgAndLocation(ctx);
      await requireScheduleManagement(ctx, { organizationId, locationId });
      await db
        .delete(bookingHoliday)
        .where(
          and(
            eq(bookingHoliday.id, input.id),
            eq(bookingHoliday.organizationId, organizationId),
            eq(bookingHoliday.locationId, locationId),
          ),
        );
      return { success: true };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: bookingStatusSchema.optional(),
        additionalNotes: z.string().optional(),
        clientId: z.string().optional(),
        dealId: z.string().optional(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const scope = requireOrgAndLocation(ctx);
      await getBookingForScope({ id: input.id, ...scope });

      const [updated] = await db
        .update(booking)
        .set({
          status: input.status,
          additionalNotes: input.additionalNotes,
          clientId: input.clientId,
          dealId: input.dealId,
          updatedAt: new Date(),
        })
        .where(eq(booking.id, input.id))
        .returning();
      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      const updatedBooking = await getBookingForScope({
        id: input.id,
        ...scope,
      });
      await logAnalytics({
        organizationId: scope.organizationId,
        locationId: scope.locationId,
        userId: ctx.auth.user.id,
        entityType: "booking",
        entityId: updatedBooking.id,
        entityName: updatedBooking.title,
        action: ActivityAction.STATUS_CHANGED,
        metadata: { status: updatedBooking.status, reason: input.reason },
      });

      return updatedBooking;
    }),

  cancel: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().optional(),
        syncToCalCom: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const scope = requireOrgAndLocation(ctx);
      const existing = await getBookingForScope({ id: input.id, ...scope });

      if (input.syncToCalCom && existing.calBookingUid) {
        const credential = await requireActiveCalComCredential(scope);
        if (existing.calComCredentialId !== credential.id) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "This booking belongs to a different Cal.com connection.",
          });
        }
        const calClient = await getCalComClient(credential.apiKey);
        await calClient.cancelBooking(existing.calBookingUid, input.reason);
      }

      await db
        .update(booking)
        .set({
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledBy: ctx.auth.user.id,
          cancellationReason: input.reason,
          updatedAt: new Date(),
        })
        .where(eq(booking.id, input.id));

      const cancelled = await getBookingForScope({ id: input.id, ...scope });
      await createNotification({
        type: "BOOKING_CANCELLED",
        title: "Booking cancelled",
        message: `${ctx.auth.user.name} cancelled a booking for ${cancelled.attendeeName}.`,
        actorId: ctx.auth.user.id,
        entityType: "booking",
        entityId: cancelled.id,
        organizationId: scope.organizationId,
        locationId: scope.locationId,
      });

      return cancelled;
    }),

  reschedule: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        newStartTime: z.string().datetime(),
        reason: z.string().optional(),
        syncToCalCom: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const scope = requireOrgAndLocation(ctx);
      const existing = await getBookingForScope({ id: input.id, ...scope });
      const newEndTime = new Date(input.newStartTime);
      newEndTime.setMinutes(newEndTime.getMinutes() + existing.duration);

      if (input.syncToCalCom && existing.calBookingUid) {
        const credential = await requireActiveCalComCredential(scope);
        if (existing.calComCredentialId !== credential.id) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "This booking belongs to a different Cal.com connection.",
          });
        }
        const calClient = await getCalComClient(credential.apiKey);
        await calClient.rescheduleBooking(existing.calBookingUid, {
          start: input.newStartTime,
          reschedulingReason: input.reason,
        });
      }

      await db
        .update(booking)
        .set({
          startTime: new Date(input.newStartTime),
          endTime: newEndTime,
          status: "RESCHEDULED",
          rescheduledFrom: existing.calBookingUid,
          updatedAt: new Date(),
        })
        .where(eq(booking.id, input.id));

      return getBookingForScope({ id: input.id, ...scope });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const scope = requireOrgAndLocation(ctx);
      await getBookingForScope({ id: input.id, ...scope });
      await db.delete(booking).where(eq(booking.id, input.id));
      return { success: true };
    }),

  getUpcoming: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(10) }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId || !ctx.locationId) {
        return [];
      }

      const rows = await db.query.booking.findMany({
        where: and(
          eq(booking.organizationId, ctx.orgId),
          eq(booking.locationId, ctx.locationId),
          gte(booking.startTime, new Date()),
          or(eq(booking.status, "PENDING"), eq(booking.status, "CONFIRMED")),
        ),
        with: bookingWithRelations,
        orderBy: asc(booking.startTime),
        limit: input.limit,
      });

      return rows.map(mapBooking);
    }),
});
