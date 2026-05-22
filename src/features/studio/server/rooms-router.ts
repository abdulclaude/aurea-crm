import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";
import { room, studioClass } from "@/db/schema";
import { createId } from "@paralleldrive/cuid2";
import { and, asc, count, eq, isNull, type SQL } from "drizzle-orm";

const roomScopeConditions = ({
  organizationId,
  locationId,
}: {
  organizationId: string;
  locationId: string | null;
}): SQL[] => [
  eq(room.organizationId, organizationId),
  locationId ? eq(room.locationId, locationId) : isNull(room.locationId),
];

const selectRoomsWithClassCount = (conditions: SQL[]) =>
  db
    .select({
      room,
      studioClassCount: count(studioClass.id),
    })
    .from(room)
    .leftJoin(studioClass, eq(studioClass.roomId, room.id))
    .where(and(...conditions))
    .groupBy(room.id)
    .orderBy(asc(room.name));

const withCount = (row: {
  room: typeof room.$inferSelect;
  studioClassCount: number;
}) => ({
  ...row.room,
  _count: { studioClass: row.studioClassCount },
});

export const roomsRouter = createTRPCRouter({
  /**
   * List all rooms for the current org/location
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

    const rooms = await selectRoomsWithClassCount(
      roomScopeConditions({
        organizationId: ctx.orgId,
        locationId: ctx.locationId ?? null,
      })
    );

    return rooms.map(withCount);
  }),

  /**
   * Get a single room by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const [roomRow] = await selectRoomsWithClassCount([
        eq(room.id, input.id),
        ...roomScopeConditions({
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
        }),
      ]);

      if (!roomRow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
      }

      return withCount(roomRow);
    }),

  /**
   * Create a new room
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required").max(100),
        capacity: z.number().int().min(1).optional(),
        description: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const [createdRoom] = await db
        .insert(room)
        .values({
          id: createId(),
          name: input.name,
          capacity: input.capacity,
          description: input.description,
          organizationId: ctx.orgId,
          locationId: ctx.locationId ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return createdRoom;
    }),

  /**
   * Update a room
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        capacity: z.number().int().min(1).optional().nullable(),
        description: z.string().max(500).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });
      const { id, ...data } = input;

      const [existing] = await db
        .select({ id: room.id })
        .from(room)
        .where(and(eq(room.id, id), eq(room.organizationId, ctx.orgId)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
      }

      const [updatedRoom] = await db
        .update(room)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(room.id, id))
        .returning();

      return updatedRoom;
    }),

  /**
   * Delete a room
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No active organization" });

      const [existing] = await selectRoomsWithClassCount([
        eq(room.id, input.id),
        eq(room.organizationId, ctx.orgId),
      ]);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
      }

      if (existing.studioClassCount > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot delete a room that has classes assigned. Reassign or remove classes first.",
        });
      }

      const [deletedRoom] = await db
        .delete(room)
        .where(eq(room.id, input.id))
        .returning();

      return deletedRoom;
    }),
});
