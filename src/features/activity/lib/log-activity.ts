import prisma from "@/lib/db";
import { ActivityType, ActivityAction } from "@prisma/client";

interface LogActivityParams {
  organizationId: string;
  subaccountId?: string | null;
  userId: string;
  type: ActivityType;
  action: ActivityAction;
  entityType: string;
  entityId: string;
  entityName: string;
  changes?: Record<string, { old: any; new: any }>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an activity to the activity timeline
 * This is a helper function that can be called from anywhere to log user actions
 */
export async function logActivity(params: LogActivityParams) {
  try {
    await prisma.activity.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: params.organizationId,
        subaccountId: params.subaccountId ?? null,
        userId: params.userId,
        type: params.type,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        entityName: params.entityName,
        changes: params.changes,
        metadata: params.metadata,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    // Log error but don't fail the operation if activity logging fails
    console.error("Failed to log activity:", error);
  }
}

/**
 * Helper to extract changed fields from update operations
 */
export function getChangedFields<T extends Record<string, any>>(
  oldData: T,
  newData: Partial<T>,
): Record<string, { old: any; new: any }> | undefined {
  const changes: Record<string, { old: any; new: any }> = {};
  let hasChanges = false;

  for (const key in newData) {
    if (newData[key] !== undefined && oldData[key] !== newData[key]) {
      // Handle JSON stringification for objects/arrays
      const oldValue = typeof oldData[key] === "object"
        ? JSON.stringify(oldData[key])
        : oldData[key];
      const newValue = typeof newData[key] === "object"
        ? JSON.stringify(newData[key])
        : newData[key];

      if (oldValue !== newValue) {
        changes[key] = {
          old: oldData[key],
          new: newData[key],
        };
        hasChanges = true;
      }
    }
  }

  return hasChanges ? changes : undefined;
}
