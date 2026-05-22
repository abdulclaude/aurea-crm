import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { db } from "@/db";
import {
  notification,
  notificationPreference,
  user as userTable,
  userPresence,
} from "@/db/schema";
import { z } from "zod";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/notifications";
import { TRPCError } from "@trpc/server";
import {
  and,
  count,
  desc,
  eq,
  inArray,
  lt,
  or,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const NOTIFICATIONS_PAGE_SIZE = 20;

const notificationActor = alias(userTable, "notificationActor");

const contextConditions = ({
  organizationId,
  locationId,
}: {
  organizationId?: string;
  locationId?: string;
}): SQL[] => {
  const conditions: SQL[] = [];
  if (organizationId) {
    conditions.push(eq(notification.organizationId, organizationId));
  }
  if (locationId) {
    conditions.push(eq(notification.locationId, locationId));
  }
  return conditions;
};

const scopedNotificationConditions = ({
  userId,
  organizationId,
  locationId,
}: {
  userId: string;
  organizationId?: string;
  locationId?: string;
}): SQL[] => [
  eq(notification.userId, userId),
  ...contextConditions({ organizationId, locationId }),
];

const preferenceRecord = (value: unknown): Record<string, boolean> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const preferences: Record<string, boolean> = {};
  const record = value as Record<string, unknown>;
  for (const [key, enabled] of Object.entries(record)) {
    if (typeof enabled === "boolean") {
      preferences[key] = enabled;
    }
  }
  return preferences;
};

export const notificationsRouter = createTRPCRouter({
  /**
   * Get paginated notifications for the current user
   */
  getNotifications: protectedProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(NOTIFICATIONS_PAGE_SIZE),
        filter: z.enum(["all", "unread", "read"]).default("all"),
        organizationId: z.string().optional(),
        locationId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit, filter, organizationId, locationId } = input;

      const conditions = scopedNotificationConditions({
        userId: ctx.auth.user.id,
        organizationId,
        locationId,
      });

      if (filter === "unread") {
        conditions.push(eq(notification.read, false));
      } else if (filter === "read") {
        conditions.push(eq(notification.read, true));
      }

      if (cursor) {
        const [cursorNotification] = await db
          .select({
            id: notification.id,
            createdAt: notification.createdAt,
          })
          .from(notification)
          .where(
            and(
              eq(notification.id, cursor),
              eq(notification.userId, ctx.auth.user.id)
            )
          )
          .limit(1);

        if (cursorNotification) {
          const cursorCondition = or(
            lt(notification.createdAt, cursorNotification.createdAt),
            and(
              eq(notification.createdAt, cursorNotification.createdAt),
              lt(notification.id, cursorNotification.id)
            )
          );

          if (cursorCondition) {
            conditions.push(cursorCondition);
          }
        }
      }

      const notifications = await db
        .select({
          notification,
          userNotificationActorIdTouser: {
            id: notificationActor.id,
            name: notificationActor.name,
            email: notificationActor.email,
            image: notificationActor.image,
          },
        })
        .from(notification)
        .leftJoin(
          notificationActor,
          eq(notification.actorId, notificationActor.id)
        )
        .where(and(...conditions))
        .orderBy(desc(notification.createdAt), desc(notification.id))
        .limit(limit + 1)
        .then((rows) =>
          rows.map(({ notification, userNotificationActorIdTouser }) => ({
            ...notification,
            userNotificationActorIdTouser,
            actor: userNotificationActorIdTouser,
          }))
        );

      let nextCursor: string | undefined = undefined;
      if (notifications.length > limit) {
        const nextItem = notifications.pop();
        nextCursor = nextItem?.id;
      }

      return {
        notifications,
        nextCursor,
      };
    }),

  /**
   * Get unread notification count
   */
  getUnreadCount: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        locationId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId, locationId } = input;

      const conditions = scopedNotificationConditions({
        userId: ctx.auth.user.id,
        organizationId,
        locationId,
      });
      conditions.push(eq(notification.read, false));

      const [{ count: unreadCount }] = await db
        .select({ count: count() })
        .from(notification)
        .where(and(...conditions));

      return { count: unreadCount };
    }),

  /**
   * Get a single notification by ID
   */
  getNotification: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select({
          notification,
          userNotificationActorIdTouser: {
            id: notificationActor.id,
            name: notificationActor.name,
            email: notificationActor.email,
            image: notificationActor.image,
          },
        })
        .from(notification)
        .leftJoin(
          notificationActor,
          eq(notification.actorId, notificationActor.id)
        )
        .where(
          and(
            eq(notification.id, input.id),
            eq(notification.userId, ctx.auth.user.id)
          )
        )
        .limit(1);

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notification not found",
        });
      }

      return {
        ...row.notification,
        userNotificationActorIdTouser: row.userNotificationActorIdTouser,
        actor: row.userNotificationActorIdTouser,
      };
    }),

  /**
   * Mark a notification as read
   */
  markAsRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await markNotificationAsRead(input.id, ctx.auth.user.id);

      return { success: true };
    }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        locationId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await markAllNotificationsAsRead(
        ctx.auth.user.id,
        input.organizationId,
        input.locationId
      );

      return { success: true };
    }),

  /**
   * Delete a notification
   */
  deleteNotification: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(notification)
        .where(
          and(
            eq(notification.id, input.id),
            eq(notification.userId, ctx.auth.user.id)
          )
        );

      return { success: true };
    }),

  /**
   * Get notification preferences for the current user
   */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const [existingPrefs] = await db
      .select()
      .from(notificationPreference)
      .where(eq(notificationPreference.userId, ctx.auth.user.id))
      .limit(1);

    if (existingPrefs) {
      return {
        ...existingPrefs,
        preferences: preferenceRecord(existingPrefs.preferences),
      };
    }

    const [prefs] = await db
      .insert(notificationPreference)
      .values({
        id: crypto.randomUUID(),
        userId: ctx.auth.user.id,
        preferences: {},
        emailEnabled: true,
        emailDigest: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return {
      ...prefs,
      preferences: preferenceRecord(prefs.preferences),
    };
  }),

  /**
   * Update notification preferences
   */
  updatePreferences: protectedProcedure
    .input(
      z.object({
        preferences: z.record(z.string(), z.boolean()).optional(),
        emailEnabled: z.boolean().optional(),
        emailDigest: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [prefs] = await db
        .insert(notificationPreference)
        .values({
          id: crypto.randomUUID(),
          userId: ctx.auth.user.id,
          preferences: input.preferences ?? {},
          emailEnabled: input.emailEnabled ?? true,
          emailDigest: input.emailDigest ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: notificationPreference.userId,
          set: {
            ...(input.preferences !== undefined && {
              preferences: input.preferences,
            }),
            ...(input.emailEnabled !== undefined && {
              emailEnabled: input.emailEnabled,
            }),
            ...(input.emailDigest !== undefined && {
              emailDigest: input.emailDigest,
            }),
            updatedAt: new Date(),
          },
        })
        .returning();

      return {
        ...prefs,
        preferences: preferenceRecord(prefs.preferences),
      };
    }),

  /**
   * Get user presence for a list of users (for agency members)
   */
  getUserPresence: protectedProcedure
    .input(
      z.object({
        userIds: z.array(z.string()),
        organizationId: z.string().optional(),
        locationId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (input.userIds.length === 0) {
        return [];
      }

      const conditions: SQL[] = [inArray(userPresence.userId, input.userIds)];
      if (input.organizationId) {
        conditions.push(eq(userPresence.organizationId, input.organizationId));
      }
      if (input.locationId) {
        conditions.push(eq(userPresence.locationId, input.locationId));
      }

      const presence = await db
        .select({
          presence: userPresence,
          user: {
            id: userTable.id,
            name: userTable.name,
            email: userTable.email,
            image: userTable.image,
          },
        })
        .from(userPresence)
        .innerJoin(userTable, eq(userPresence.userId, userTable.id))
        .where(and(...conditions));

      return presence.map(({ presence, user }) => ({ ...presence, user }));
    }),

  /**
   * Update user presence (called by heartbeat)
   */
  updatePresence: protectedProcedure
    .input(
      z.object({
        status: z.enum(["online", "offline", "away"]),
        organizationId: z.string().optional(),
        locationId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const [presence] = await db
        .insert(userPresence)
        .values({
          id: crypto.randomUUID(),
          userId: ctx.auth.user.id,
          status: input.status,
          organizationId: input.organizationId ?? null,
          locationId: input.locationId ?? null,
          lastSeenAt: now,
          lastActivityAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userPresence.userId,
          set: {
            status: input.status,
            organizationId: input.organizationId ?? null,
            locationId: input.locationId ?? null,
            lastSeenAt: now,
            lastActivityAt: now,
            updatedAt: now,
          },
        })
        .returning();

      return presence;
    }),
});
