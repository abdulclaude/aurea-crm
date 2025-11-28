import db from "@/lib/db";
import { getPostHogClient } from "@/lib/posthog/server";
import { Resend } from "resend";

const posthog = getPostHogClient();

const resend = new Resend(process.env.RESEND_API_KEY);

export type NotificationType =
  | "WORKFLOW_CREATED"
  | "WORKFLOW_UPDATED"
  | "WORKFLOW_DELETED"
  | "CONTACT_CREATED"
  | "CONTACT_UPDATED"
  | "CONTACT_DELETED"
  | "DEAL_CREATED"
  | "DEAL_UPDATED"
  | "DEAL_DELETED"
  | "PIPELINE_CREATED"
  | "PIPELINE_UPDATED"
  | "PIPELINE_DELETED"
  | "INVITE_SENT"
  | "INVITE_ACCEPTED"
  | "INVITE_DECLINED"
  | "MEMBER_ONLINE"
  | "MEMBER_OFFLINE";

export type EntityType =
  | "workflow"
  | "contact"
  | "deal"
  | "pipeline"
  | "invitation";

interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  actorId?: string;
  entityType?: EntityType;
  entityId?: string;
  data?: Record<string, unknown>;
  organizationId?: string | null;
  subaccountId?: string | null;
}

interface NotificationRecipient {
  userId: string;
  email: string;
  name: string;
  shouldEmail: boolean;
}

/**
 * Get notification recipients based on context and user roles
 */
export async function getNotificationRecipients(
  organizationId: string | null,
  subaccountId: string | null,
  entityType?: EntityType,
  entityId?: string
): Promise<NotificationRecipient[]> {
  const recipients: NotificationRecipient[] = [];

  if (subaccountId) {
    // Get all subaccount members
    const subaccountMembers = await db.subaccountMember.findMany({
      where: { subaccountId },
      include: {
        user: {
          include: {
            notificationPreference: true,
          },
        },
      },
    });

    for (const member of subaccountMembers) {
      recipients.push({
        userId: member.userId,
        email: member.user.email,
        name: member.user.name,
        shouldEmail:
          member.user.notificationPreference?.emailEnabled ?? true,
      });
    }

    // Also get agency members assigned to this subaccount
    if (organizationId) {
      const agencyMembers = await db.member.findMany({
        where: {
          organizationId,
        },
        include: {
          user: {
            include: {
              notificationPreference: true,
              subaccountMemberships: {
                where: { subaccountId },
              },
            },
          },
        },
      });

      for (const member of agencyMembers) {
        // Only add if they have a subaccount membership (assigned to this client)
        if (member.user.subaccountMemberships.length > 0) {
          // Avoid duplicates
          if (!recipients.find((r) => r.userId === member.userId)) {
            recipients.push({
              userId: member.userId,
              email: member.user.email,
              name: member.user.name,
              shouldEmail:
                member.user.notificationPreference?.emailEnabled ?? true,
            });
          }
        }
      }
    }
  } else if (organizationId) {
    // Organization-level notification - send to all org members
    const orgMembers = await db.member.findMany({
      where: { organizationId },
      include: {
        user: {
          include: {
            notificationPreference: true,
          },
        },
      },
    });

    for (const member of orgMembers) {
      recipients.push({
        userId: member.userId,
        email: member.user.email,
        name: member.user.name,
        shouldEmail:
          member.user.notificationPreference?.emailEnabled ?? true,
      });
    }
  }

  return recipients;
}

/**
 * Create a notification and send to appropriate recipients
 */
export async function createNotification(
  params: CreateNotificationParams
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
    subaccountId,
  } = params;

  // Get recipients based on context
  const recipients = await getNotificationRecipients(
    organizationId ?? null,
    subaccountId ?? null,
    entityType,
    entityId
  );

  // Filter out the actor (don't notify yourself)
  const filteredRecipients = recipients.filter((r) => r.userId !== actorId);

  if (filteredRecipients.length === 0) {
    return;
  }

  // Create notifications in database
  const notifications = await db.notification.createMany({
    data: filteredRecipients.map((recipient) => ({
      userId: recipient.userId,
      organizationId: organizationId ?? undefined,
      subaccountId: subaccountId ?? undefined,
      type,
      title,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined,
      entityType,
      entityId,
      actorId,
    })),
  });

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
        subaccountId,
      },
    });
  } catch (error) {
    console.error("Failed to track notification in PostHog:", error);
  }

  // Send email notifications for critical events
  const criticalTypes: NotificationType[] = [
    "INVITE_SENT",
    "INVITE_ACCEPTED",
    "DEAL_CREATED",
    "PIPELINE_CREATED",
  ];

  if (criticalTypes.includes(type)) {
    for (const recipient of filteredRecipients) {
      if (recipient.shouldEmail) {
        await sendEmailNotification(recipient, title, message, {
          entityType,
          entityId,
        });
      }
    }
  }
}

/**
 * Send email notification via Resend
 */
async function sendEmailNotification(
  recipient: NotificationRecipient,
  title: string,
  message: string,
  context: { entityType?: EntityType; entityId?: string }
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
        case "contact":
          actionUrl = `${baseUrl}/contacts`;
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

    await resend.emails.send({
      from: "Aurea CRM <notifications@aurea-crm.com>",
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
                    View Details
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

    // Track email send in PostHog
    posthog?.capture({
      distinctId: recipient.userId,
      event: "notification_email_sent",
      properties: {
        title,
        entityType: context.entityType,
        entityId: context.entityId,
      },
    });
  } catch (error) {
    console.error("Failed to send email notification:", error);
    // Don't throw - email failure shouldn't break the notification system
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<void> {
  await db.notification.updateMany({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  });

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
  subaccountId?: string
): Promise<void> {
  await db.notification.updateMany({
    where: {
      userId,
      read: false,
      ...(organizationId && { organizationId }),
      ...(subaccountId && { subaccountId }),
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  });

  posthog?.capture({
    distinctId: userId,
    event: "notifications_marked_all_read",
    properties: {
      organizationId,
      subaccountId,
    },
  });
}

/**
 * Delete old notifications (older than retention period)
 */
export async function cleanupOldNotifications(
  retentionDays: number = 14
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await db.notification.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}
