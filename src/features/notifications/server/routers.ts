import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import prisma from "@/lib/db";
import { z } from "zod";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/notifications";

const NOTIFICATIONS_PAGE_SIZE = 20;

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
        subaccountId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit, filter, organizationId, subaccountId } = input;

      const where: any = {
        userId: ctx.auth.user.id,
      };

      // Filter by read status
      if (filter === "unread") {
        where.read = false;
      } else if (filter === "read") {
        where.read = true;
      }

      // Filter by context
      if (organizationId) {
        where.organizationId = organizationId;
      }
      if (subaccountId) {
        where.subaccountId = subaccountId;
      }

      const notifications = await prisma.notification.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          userNotificationActorIdTouser: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

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
        subaccountId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId, subaccountId } = input;

      const where: any = {
        userId: ctx.auth.user.id,
        read: false,
      };

      if (organizationId) {
        where.organizationId = organizationId;
      }
      if (subaccountId) {
        where.subaccountId = subaccountId;
      }

      const count = await prisma.notification.count({
        where,
      });

      return { count };
    }),

  /**
   * Get a single notification by ID
   */
  getNotification: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const notification = await prisma.notification.findFirstOrThrow({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
        include: {
          userNotificationActorIdTouser: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      return notification;
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
        subaccountId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await markAllNotificationsAsRead(
        ctx.auth.user.id,
        input.organizationId,
        input.subaccountId
      );

      return { success: true };
    }),

  /**
   * Delete a notification
   */
  deleteNotification: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.notification.deleteMany({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
      });

      return { success: true };
    }),

  /**
   * Get notification preferences for the current user
   */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    let prefs = await prisma.notificationPreference.findUnique({
      where: {
        userId: ctx.auth.user.id,
      },
    });

    // Create default preferences if they don't exist
    if (!prefs) {
      prefs = await prisma.notificationPreference.create({
        data: {
          id: crypto.randomUUID(),
          userId: ctx.auth.user.id,
          preferences: {},
          emailEnabled: true,
          emailDigest: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    return prefs;
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
      const prefs = await prisma.notificationPreference.upsert({
        where: {
          userId: ctx.auth.user.id,
        },
        create: {
          id: crypto.randomUUID(),
          userId: ctx.auth.user.id,
          preferences: input.preferences ?? {},
          emailEnabled: input.emailEnabled ?? true,
          emailDigest: input.emailDigest ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        update: {
          ...(input.preferences !== undefined && {
            preferences: input.preferences,
          }),
          ...(input.emailEnabled !== undefined && {
            emailEnabled: input.emailEnabled,
          }),
          ...(input.emailDigest !== undefined && {
            emailDigest: input.emailDigest,
          }),
        },
      });

      return prefs;
    }),

  /**
   * Get user presence for a list of users (for agency members)
   */
  getUserPresence: protectedProcedure
    .input(
      z.object({
        userIds: z.array(z.string()),
        organizationId: z.string().optional(),
        subaccountId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        userId: {
          in: input.userIds,
        },
      };

      if (input.organizationId) {
        where.organizationId = input.organizationId;
      }
      if (input.subaccountId) {
        where.subaccountId = input.subaccountId;
      }

      const presence = await prisma.userPresence.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      return presence;
    }),

  /**
   * Update user presence (called by heartbeat)
   */
  updatePresence: protectedProcedure
    .input(
      z.object({
        status: z.enum(["online", "offline", "away"]),
        organizationId: z.string().optional(),
        subaccountId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const presence = await prisma.userPresence.upsert({
        where: {
          userId: ctx.auth.user.id,
        },
        create: {
          id: crypto.randomUUID(),
          userId: ctx.auth.user.id,
          status: input.status,
          organizationId: input.organizationId ?? null,
          subaccountId: input.subaccountId ?? null,
          lastSeenAt: new Date(),
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        },
        update: {
          status: input.status,
          organizationId: input.organizationId ?? null,
          subaccountId: input.subaccountId ?? null,
          lastSeenAt: new Date(),
          lastActivityAt: new Date(),
        },
      });

      return presence;
    }),
});
