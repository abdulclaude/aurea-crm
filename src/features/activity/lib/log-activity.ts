import { db } from "@/db";
import { activity } from "@/db/schema";
import type { ActivityAction, ActivityType } from "@/db/enums";

type ChangedFields = Record<string, { old: unknown; new: unknown }>;

interface LogActivityParams {
  organizationId: string;
  locationId?: string | null;
  userId: string;
  type: ActivityType;
  action: ActivityAction;
  entityType: string;
  entityId: string;
  entityName: string;
  changes?: ChangedFields;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an activity to the activity timeline
 * This is a helper function that can be called from anywhere to log user actions
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await db.insert(activity).values({
        id: crypto.randomUUID(),
        organizationId: params.organizationId,
        locationId: params.locationId ?? null,
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
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

/**
 * Helper to extract changed fields from update operations
 */
export function getChangedFields<T extends Record<string, unknown>>(
  oldData: T,
  newData: Partial<T>,
): ChangedFields | undefined {
  const changes: ChangedFields = {};
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
