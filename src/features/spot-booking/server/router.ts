import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  room,
  roomLayout,
  spot,
  spotBooking,
  spotReservation,
  studioClass,
} from "@/db/schema";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "@/trpc/init";

const visualizerEquipmentTypes = ["MAT", "REFORMER", "BIKE", "STRENGTH", "OPEN"] as const;
const visualizerPatterns = ["GRID", "STAGGERED", "CENTER_AISLE", "ARC"] as const;
const visualizerDensities = ["COMPACT", "BALANCED", "PREMIUM"] as const;
const visualizerThemes = ["WARM", "CHARCOAL", "LIGHT"] as const;
const spotTypeSchema = z.enum(["STANDARD", "PREMIUM", "INSTRUCTOR", "BLOCKED", "EQUIPMENT"]);

const visualizerConfigSchema = z.object({
  spaceCount: z.number().int().min(1).max(80),
  rows: z.number().int().min(1).max(12),
  equipment: z.enum(visualizerEquipmentTypes),
  pattern: z.enum(visualizerPatterns),
  density: z.enum(visualizerDensities),
  theme: z.enum(visualizerThemes),
  showClearance: z.boolean(),
  showInstructorZone: z.boolean(),
  showMirrors: z.boolean(),
  showWindows: z.boolean(),
  showStorage: z.boolean(),
});

function requireOrg(ctx: { orgId: string | null }) {
  if (!ctx.orgId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization context is required",
    });
  }
  return ctx.orgId;
}

async function ensureRoom({
  roomId,
  organizationId,
  locationId,
}: {
  roomId: string;
  organizationId: string;
  locationId: string | null;
}) {
  const targetRoom = await db.query.room.findFirst({
    where: and(
      eq(room.id, roomId),
      eq(room.organizationId, organizationId),
      locationId ? eq(room.locationId, locationId) : undefined,
    ),
  });
  if (!targetRoom) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
  }
  return targetRoom;
}

function gridSpots({
  layoutId,
  rows,
  columns,
  activeSpaces,
  equipment,
  pattern,
  density,
}: {
  layoutId: string;
  rows: number;
  columns: number;
  activeSpaces: number;
  equipment: (typeof visualizerEquipmentTypes)[number];
  pattern?: string;
  density?: string;
}) {
  return Array.from({ length: rows * columns }, (_, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    return {
      id: randomUUID(),
      layoutId,
      label: `${String.fromCharCode(65 + row)}${col + 1}`,
      row,
      col,
      type: equipment === "OPEN" ? ("STANDARD" as const) : ("EQUIPMENT" as const),
      isActive: index < activeSpaces,
      equipment: equipment === "OPEN" ? null : equipment,
      metadata:
        pattern && density
          ? { visualizerIndex: index, pattern, density }
          : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
}

export const spotBookingRouter = createTRPCRouter({
  getLayout: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      await ensureRoom({ roomId: input.roomId, organizationId, locationId: ctx.locationId });

      const layout = await db.query.roomLayout.findFirst({
        where: and(eq(roomLayout.roomId, input.roomId), eq(roomLayout.isDefault, true)),
        with: { spots: { orderBy: [asc(spot.row), asc(spot.col)] } },
      });

      return layout ?? null;
    }),

  listLayouts: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      await ensureRoom({ roomId: input.roomId, organizationId, locationId: ctx.locationId });

      const layouts = await db.query.roomLayout.findMany({
        where: eq(roomLayout.roomId, input.roomId),
        orderBy: desc(roomLayout.createdAt),
      });

      return Promise.all(
        layouts.map(async (layout) => {
          const [result] = await db
            .select({ total: count() })
            .from(spot)
            .where(eq(spot.layoutId, layout.id));
          return { ...layout, _count: { spots: result?.total ?? 0 } };
        }),
      );
    }),

  createLayout: protectedProcedure
    .input(
      z.object({
        roomId: z.string(),
        name: z.string().min(1),
        rows: z.number().int().min(1).max(20),
        columns: z.number().int().min(1).max(20),
        isDefault: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      await ensureRoom({ roomId: input.roomId, organizationId, locationId: ctx.locationId });

      const layoutId = randomUUID();
      await db.transaction(async (tx) => {
        if (input.isDefault) {
          await tx
            .update(roomLayout)
            .set({ isDefault: false, updatedAt: new Date() })
            .where(eq(roomLayout.roomId, input.roomId));
        }

        await tx.insert(roomLayout).values({
          id: layoutId,
          roomId: input.roomId,
          name: input.name,
          rows: input.rows,
          columns: input.columns,
          isDefault: input.isDefault,
          layoutData: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await tx.insert(spot).values(
          gridSpots({
            layoutId,
            rows: input.rows,
            columns: input.columns,
            activeSpaces: input.rows * input.columns,
            equipment: "OPEN",
          }),
        );
      });

      return db.query.roomLayout.findFirst({
        where: eq(roomLayout.id, layoutId),
        with: { spots: { orderBy: [asc(spot.row), asc(spot.col)] } },
      });
    }),

  upsertVisualizerLayout: protectedProcedure
    .input(
      z.object({
        roomId: z.string(),
        name: z.string().min(1).max(120),
        rows: z.number().int().min(1).max(12),
        columns: z.number().int().min(1).max(12),
        isDefault: z.boolean().default(true),
        config: visualizerConfigSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = requireOrg(ctx);
      await ensureRoom({ roomId: input.roomId, organizationId, locationId: ctx.locationId });
      const totalSlots = input.rows * input.columns;
      const activeSpaces = Math.min(input.config.spaceCount, totalSlots);

      const layoutId = await db.transaction(async (tx) => {
        const existingLayout = await tx.query.roomLayout.findFirst({
          where: and(eq(roomLayout.roomId, input.roomId), eq(roomLayout.isDefault, true)),
          columns: { id: true },
        });

        if (input.isDefault) {
          await tx
            .update(roomLayout)
            .set({ isDefault: false, updatedAt: new Date() })
            .where(eq(roomLayout.roomId, input.roomId));
        }

        const id = existingLayout?.id ?? randomUUID();
        if (existingLayout) {
          await tx
            .update(roomLayout)
            .set({
              name: input.name.trim(),
              rows: input.rows,
              columns: input.columns,
              isDefault: input.isDefault,
              layoutData: input.config,
              updatedAt: new Date(),
            })
            .where(eq(roomLayout.id, id));
        } else {
          await tx.insert(roomLayout).values({
            id,
            roomId: input.roomId,
            name: input.name.trim(),
            rows: input.rows,
            columns: input.columns,
            isDefault: input.isDefault,
            layoutData: input.config,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        await tx.delete(spot).where(eq(spot.layoutId, id));
        await tx.insert(spot).values(
          gridSpots({
            layoutId: id,
            rows: input.rows,
            columns: input.columns,
            activeSpaces,
            equipment: input.config.equipment,
            pattern: input.config.pattern,
            density: input.config.density,
          }),
        );

        return id;
      });

      return db.query.roomLayout.findFirst({
        where: eq(roomLayout.id, layoutId),
        with: { spots: { orderBy: [asc(spot.row), asc(spot.col)] } },
      });
    }),

  updateSpot: protectedProcedure
    .input(
      z.object({
        spotId: z.string(),
        label: z.string().optional(),
        type: spotTypeSchema.optional(),
        isActive: z.boolean().optional(),
        equipment: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(spot)
        .set({
          label: input.label,
          type: input.type,
          isActive: input.isActive,
          equipment: input.equipment,
          updatedAt: new Date(),
        })
        .where(eq(spot.id, input.spotId))
        .returning();
      return updated;
    }),

  updateSpotsBatch: protectedProcedure
    .input(
      z.object({
        updates: z.array(
          z.object({
            spotId: z.string(),
            type: spotTypeSchema.optional(),
            isActive: z.boolean().optional(),
            label: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      await db.transaction(async (tx) => {
        for (const update of input.updates) {
          await tx
            .update(spot)
            .set({
              type: update.type,
              isActive: update.isActive,
              label: update.label,
              updatedAt: new Date(),
            })
            .where(eq(spot.id, update.spotId));
        }
      });
      return { updated: input.updates.length };
    }),

  deleteLayout: protectedProcedure
    .input(z.object({ layoutId: z.string() }))
    .mutation(async ({ input }) => {
      const [deleted] = await db
        .delete(roomLayout)
        .where(eq(roomLayout.id, input.layoutId))
        .returning();
      return deleted;
    }),

  getAvailableSpots: protectedProcedure
    .input(z.object({ classId: z.string() }))
    .query(async ({ input }) => {
      const targetClass = await db.query.studioClass.findFirst({
        where: eq(studioClass.id, input.classId),
        columns: { roomId: true },
      });
      if (!targetClass?.roomId) return { spots: [], layout: null };

      const layout = await db.query.roomLayout.findFirst({
        where: and(eq(roomLayout.roomId, targetClass.roomId), eq(roomLayout.isDefault, true)),
        with: {
          spots: {
            where: eq(spot.isActive, true),
            orderBy: [asc(spot.row), asc(spot.col)],
            with: { spotBookings: true },
          },
        },
      });
      if (!layout) return { spots: [], layout: null };

      const spots = layout.spots.map((item) => {
        const booking = item.spotBookings.find(
          (booking) => booking.classId === input.classId,
        );
        return {
          ...item,
          isBooked: Boolean(booking),
          bookedBy: booking?.clientId ?? null,
        };
      });

      return {
        spots,
        layout: { id: layout.id, name: layout.name, rows: layout.rows, columns: layout.columns },
      };
    }),

  bookSpot: protectedProcedure
    .input(
      z.object({
        spotId: z.string(),
        bookingId: z.string(),
        clientId: z.string(),
        classId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const existing = await db.query.spotBooking.findFirst({
        where: and(eq(spotBooking.spotId, input.spotId), eq(spotBooking.classId, input.classId)),
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Spot already taken" });
      }

      const [created] = await db
        .insert(spotBooking)
        .values({ id: randomUUID(), ...input, createdAt: new Date() })
        .returning();
      return created;
    }),

  releaseSpot: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .mutation(async ({ input }) => {
      const deleted = await db
        .delete(spotBooking)
        .where(eq(spotBooking.bookingId, input.bookingId))
        .returning();
      return { count: deleted.length };
    }),

  getPublicLayout: baseProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ input }) => {
      const layout = await db.query.roomLayout.findFirst({
        where: and(eq(roomLayout.roomId, input.roomId), eq(roomLayout.isDefault, true)),
        with: {
          room: { columns: { id: true, name: true, capacity: true } },
          spots: {
            where: eq(spot.isActive, true),
            orderBy: [asc(spot.row), asc(spot.col)],
            with: { spotReservations: true },
          },
        },
      });
      if (!layout) return null;

      return {
        id: layout.id,
        name: layout.name,
        rows: layout.rows,
        columns: layout.columns,
        layoutData: layout.layoutData,
        room: layout.room,
        spots: layout.spots.map((item) => {
          const reservation = item.spotReservations[0] ?? null;
          return {
            id: item.id,
            label: item.label,
            row: item.row,
            col: item.col,
            type: item.type,
            equipment: item.equipment,
            isBooked: Boolean(reservation),
            reservedBy: reservation?.guestName ?? null,
            reservationSessionId: reservation?.sessionId ?? null,
          };
        }),
      };
    }),

  reserveSpot: baseProcedure
    .input(
      z.object({
        spotId: z.string(),
        guestName: z.string().min(1).max(100),
        sessionId: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const targetSpot = await db.query.spot.findFirst({
        where: eq(spot.id, input.spotId),
        with: { spotReservations: true, roomLayout: { columns: { id: true } } },
      });
      if (!targetSpot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Spot not found" });
      }
      if (!targetSpot.isActive) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Spot is not available" });
      }
      if (targetSpot.spotReservations.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Spot already taken" });
      }

      const [created] = await db
        .insert(spotReservation)
        .values({
          id: randomUUID(),
          spotId: input.spotId,
          layoutId: targetSpot.roomLayout.id,
          guestName: input.guestName.trim(),
          sessionId: input.sessionId,
          createdAt: new Date(),
        })
        .returning();
      return created;
    }),

  unreserveSpot: baseProcedure
    .input(z.object({ spotId: z.string(), sessionId: z.string() }))
    .mutation(async ({ input }) => {
      const reservation = await db.query.spotReservation.findFirst({
        where: eq(spotReservation.spotId, input.spotId),
      });
      if (!reservation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No reservation found" });
      }
      if (reservation.sessionId !== input.sessionId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your reservation" });
      }

      const [deleted] = await db
        .delete(spotReservation)
        .where(eq(spotReservation.id, reservation.id))
        .returning();
      return deleted;
    }),

  clearReservations: baseProcedure
    .input(z.object({ layoutId: z.string() }))
    .mutation(async ({ input }) => {
      const deleted = await db
        .delete(spotReservation)
        .where(eq(spotReservation.layoutId, input.layoutId))
        .returning();
      return { count: deleted.length };
    }),
});
