import { db } from "@/db";
import {
  member,
  notification,
  notificationPreference,
  locationMember,
  user,
  instructor,
} from "@/db/schema";
import { getPostHogClient } from "@/lib/posthog/server";
import { and, eq, inArray, lt, type SQL } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import {
  isNotificationEventEnabled,
  normalizeNotificationPreferences,
  type NotificationPreferenceMap,
} from "@/features/notifications/lib/preferences";
import type { NotificationType } from "@/features/notifications/contracts";
import {
  EMAIL_NOTIFICATION_TYPES,
  INSTRUCTOR_NOTIFICATION_TYPES,
} from "@/features/notifications/settings-registry";

const posthog = getPostHogClient();

export type EntityType =
  | "workflow"
  | "client"
  | "deal"
  | "pipeline"
  | "invitation"
  | "campaign"
  | "invoice"
  | "booking"
  | "organization"
  | "location"
  | "task"
  | "import";

interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  actorId?: string;
  entityType?: EntityType;
  entityId?: string;
  data?: Record<string, unknown>;
  organizationId?: string | null;
  locationId?: string | null;
}

interface NotificationRecipient {
  userId: string;
  email: string;
  name: string;
  shouldEmail: boolean;
  preferences: NotificationPreferenceMap;
}

/**
 * Get notification recipients based on context and user roles
 */
export async function getNotificationRecipients(
  organizationId: string | null,
  locationId: string | null,
  entityType?: EntityType,
  entityId?: string,
): Promise<NotificationRecipient[]> {
  const recipients: NotificationRecipient[] = [];

  if (locationId) {
    const locationRows = await db
      .select({
        userId: locationMember.userId,
        email: user.email,
        name: user.name,
        emailEnabled: notificationPreference.emailEnabled,
        preferences: notificationPreference.preferences,
      })
      .from(locationMember)
      .innerJoin(user, eq(locationMember.userId, user.id))
      .leftJoin(
        notificationPreference,
        eq(notificationPreference.userId, user.id),
      )
      .where(eq(locationMember.locationId, locationId));

    for (const member of locationRows) {
      recipients.push({
        userId: member.userId,
        email: member.email,
        name: member.name,
        shouldEmail: member.emailEnabled ?? true,
        preferences: normalizeNotificationPreferences(member.preferences),
      });
    }

    if (organizationId) {
      const agencyRows = await db
        .select({
          userId: member.userId,
          email: user.email,
          name: user.name,
          emailEnabled: notificationPreference.emailEnabled,
          preferences: notificationPreference.preferences,
        })
        .from(member)
        .innerJoin(user, eq(member.userId, user.id))
        .innerJoin(
          locationMember,
          and(
            eq(locationMember.userId, member.userId),
            eq(locationMember.locationId, locationId),
          ),
        )
        .leftJoin(
          notificationPreference,
          eq(notificationPreference.userId, user.id),
        )
        .where(eq(member.organizationId, organizationId));

      for (const member of agencyRows) {
        if (
          !recipients.find((recipient) => recipient.userId === member.userId)
        ) {
          recipients.push({
            userId: member.userId,
            email: member.email,
            name: member.name,
            shouldEmail: member.emailEnabled ?? true,
            preferences: normalizeNotificationPreferences(member.preferences),
          });
        }
      }
    }
  } else if (organizationId) {
    const orgRows = await db
      .select({
        userId: member.userId,
        email: user.email,
        name: user.name,
        emailEnabled: notificationPreference.emailEnabled,
        preferences: notificationPreference.preferences,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .leftJoin(
        notificationPreference,
        eq(notificationPreference.userId, user.id),
      )
      .where(eq(member.organizationId, organizationId));

    for (const member of orgRows) {
      recipients.push({
        userId: member.userId,
        email: member.email,
        name: member.name,
        shouldEmail: member.emailEnabled ?? true,
        preferences: normalizeNotificationPreferences(member.preferences),
      });
    }
  }

  return recipients;
}

/**
 * Create a notification and send to appropriate recipients
 */
export async function createNotification(
  params: CreateNotificationParams,
): Promise<void> {
  const {
    type,
    title,
    message,
    actorId,
    entityType,
    entityId,
    data,
    organizationId,
    locationId,
  } = params;

  // Get recipients based on context
  const recipients = await getNotificationRecipients(
    organizationId ?? null,
    locationId ?? null,
    entityType,
    entityId,
  );

  // Filter out the actor (don't notify yourself)
  let filteredRecipients = recipients.filter(
    (recipient) =>
      recipient.userId !== actorId &&
      isNotificationEventEnabled(recipient.preferences, type),
  );

  // For instructor-specific notifications, only send to users who are instructors
  if (INSTRUCTOR_NOTIFICATION_TYPES.has(type)) {
    const recipientUserIds = filteredRecipients.map(
      (recipient) => recipient.userId,
    );
    const instructorInstructors =
      recipientUserIds.length > 0
        ? await db
            .select({ userId: instructor.userId })
            .from(instructor)
            .where(
              and(
                inArray(instructor.userId, recipientUserIds),
                eq(instructor.isActive, true),
              ),
            )
        : [];
    const instructorUserIds = new Set(
      instructorInstructors
        .map((instructor) => instructor.userId)
        .filter(Boolean),
    );
    filteredRecipients = filteredRecipients.filter((r) =>
      instructorUserIds.has(r.userId),
    );
  }

  if (filteredRecipients.length === 0) {
    return;
  }

  const notificationRows = filteredRecipients.map((recipient) => ({
    recipient,
    values: {
      id: crypto.randomUUID(),
      userId: recipient.userId,
      organizationId: organizationId ?? null,
      locationId: locationId ?? null,
      type,
      title,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : null,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      actorId: actorId ?? null,
      createdAt: new Date(),
    },
  }));

  await db
    .insert(notification)
    .values(notificationRows.map((row) => row.values));

  // Track in PostHog
  try {
    posthog?.capture({
      distinctId: actorId || "system",
      event: "notification_created",
      properties: {
        type,
        entityType,
        entityId,
        recipientCount: filteredRecipients.length,
        organizationId,
        locationId,
      },
    });
  } catch (error) {
    console.error("Failed to track notification in PostHog:", error);
  }

  // Send email notifications for critical events
  if (EMAIL_NOTIFICATION_TYPES.has(type) && organizationId) {
    for (const row of notificationRows) {
      const { recipient } = row;
      if (recipient.shouldEmail) {
        await sendEmailNotification(recipient, title, message, {
          notificationId: row.values.id,
          entityType,
          entityId,
          organizationId,
          locationId: locationId ?? null,
        });
      }
    }
  }
}

/**
 * Queue a critical email notification through the durable delivery outbox.
 */
async function sendEmailNotification(
  recipient: NotificationRecipient,
  title: string,
  message: string,
  context: {
    entityType?: EntityType;
    entityId?: string;
    organizationId: string;
    locationId: string | null;
    notificationId: string;
  },
): Promise<void> {
  try {
    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    let actionUrl = `${baseUrl}/dashboard`;

    // Generate appropriate link based on entity type
    if (context.entityType && context.entityId) {
      switch (context.entityType) {
        case "workflow":
          actionUrl = `${baseUrl}/workflows/${context.entityId}`;
          break;
        case "client":
          actionUrl = `${baseUrl}/clients`;
          break;
        case "deal":
          actionUrl = `${baseUrl}/deals`;
          break;
        case "pipeline":
          actionUrl = `${baseUrl}/pipelines`;
          break;
        case "invitation":
          actionUrl = `${baseUrl}/invitation/${context.entityId}`;
          break;
      }
    }

    const result = await sendEmail({
      organizationId: context.organizationId,
      locationId: context.locationId,
      clientId: null,
      sourceType: "NOTIFICATION",
      sourceId: context.notificationId,
      idempotencyKey: `notification:${context.notificationId}:email`,
      fromName: "Aurea CRM",
      to: recipient.email,
      subject: title,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">${title}</h1>
              </div>

              <div style="padding: 40px 30px;">
                <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                  Hi ${recipient.name},
                </p>

                <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">
                  ${message}
                </p>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    View details
                  </a>
                </div>

                <p style="margin: 30px 0 0; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; line-height: 1.5;">
                  You're receiving this email because you're a member of the organization.
                  <a href="${baseUrl}/settings/notifications" style="color: #667eea; text-decoration: none;">Manage your notification preferences</a>.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (!result.success) {
      console.error("Failed to queue email notification", {
        notificationId: context.notificationId,
        error: result.error,
      });
      return;
    }

    // Provider delivery is tracked by the durable outbox and Resend webhook.
    posthog?.capture({
      distinctId: recipient.userId,
      event: "notification_email_queued",
      properties: {
        deliveryId: result.deliveryId,
        title,
        entityType: context.entityType,
        entityId: context.entityId,
      },
    });
  } catch (error) {
    console.error("Failed to queue email notification", {
      notificationId: context.notificationId,
      error: error instanceof Error ? error.message : "Unknown queue error",
    });
    // Don't throw - email failure shouldn't break the notification system
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
): Promise<void> {
  await db
    .update(notification)
    .set({
      read: true,
      readAt: new Date(),
    })
    .where(
      and(eq(notification.id, notificationId), eq(notification.userId, userId)),
    );

  posthog?.capture({
    distinctId: userId,
    event: "notification_read",
    properties: {
      notificationId,
    },
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(
  userId: string,
  organizationId?: string,
  locationId?: string,
): Promise<void> {
  const filters: SQL[] = [
    eq(notification.userId, userId),
    eq(notification.read, false),
  ];

  if (organizationId) {
    filters.push(eq(notification.organizationId, organizationId));
  }

  if (locationId) {
    filters.push(eq(notification.locationId, locationId));
  }

  await db
    .update(notification)
    .set({
      read: true,
      readAt: new Date(),
    })
    .where(and(...filters));

  posthog?.capture({
    distinctId: userId,
    event: "notifications_marked_all_read",
    properties: {
      organizationId,
      locationId,
    },
  });
}

/**
 * Delete old notifications (older than retention period)
 */
export async function cleanupOldNotifications(
  retentionDays: number = 14,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await db
    .delete(notification)
    .where(lt(notification.createdAt, cutoffDate));

  return result.rowCount ?? 0;
}
