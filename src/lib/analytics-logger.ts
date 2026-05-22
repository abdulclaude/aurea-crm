import { logActivity, getChangedFields } from "@/features/activity/lib/log-activity";
import {
  ActivityType,
  type ActivityAction,
  type ActivityType as ActivityTypeValue,
} from "@/db/enums";
import { getPostHogClient } from "@/lib/posthog/server";

interface AnalyticsLoggerParams {
  // Required fields
  organizationId: string;
  userId: string;
  entityType: string;
  entityId: string;
  entityName: string;
  action: ActivityAction;

  // Optional fields
  locationId?: string | null;
  type?: ActivityTypeValue;
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;

  // PostHog-specific properties
  posthogEvent?: string; // Override default event name
  posthogProperties?: Record<string, unknown>; // Additional PostHog properties
}

/**
 * Unified logging function that logs both to Activity timeline and PostHog analytics
 * This replaces the need to call logActivity and PostHog tracking separately
 */
export async function logAnalytics(
  params: AnalyticsLoggerParams
): Promise<void> {
  const {
    organizationId,
    locationId,
    userId,
    type,
    action,
    entityType,
    entityId,
    entityName,
    changes,
    metadata,
    ipAddress,
    userAgent,
    posthogEvent,
    posthogProperties = {},
  } = params;

  // Determine ActivityType from entityType if not provided
  const activityType = type || determineActivityType(entityType);

  // Log to Activity timeline
  try {
    await logActivity({
      organizationId,
      locationId: locationId ?? null,
      userId,
      type: activityType,
      action,
      entityType,
      entityId,
      entityName,
      changes,
      metadata,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }

  // Log to PostHog
  try {
    const client = getPostHogClient();
    if (client) {
      // Construct PostHog event name
      const eventName = posthogEvent || `${entityType}_${action.toLowerCase()}`;

      // Construct event properties
      const eventProperties: Record<string, unknown> = {
        ...posthogProperties,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        action,
        organization_id: organizationId,
        ...(locationId && { location_id: locationId }),
        ...(changes && { changes: Object.keys(changes) }), // Track which fields changed
        ...(metadata && { metadata }),
        $groups: {
          organization: organizationId,
          ...(locationId && { location: locationId }),
        },
      };

      client.capture({
        distinctId: userId,
        event: eventName,
        properties: eventProperties,
      });

      // Flush immediately to ensure event is sent
      await client.flush();
    }
  } catch (error) {
    console.error("Failed to log PostHog event:", error);
  }
}

/**
 * Helper function to determine ActivityType from entityType string
 */
function determineActivityType(entityType: string): ActivityTypeValue {
  const entityTypeMap: Record<string, ActivityTypeValue> = {
    client: ActivityType.CLIENT,
    deal: ActivityType.DEAL,
    workflow: ActivityType.WORKFLOW,
    execution: ActivityType.EXECUTION,
    pipeline: ActivityType.PIPELINE,
    instructor: ActivityType.INSTRUCTOR,
    time_log: ActivityType.TIME_LOG,
    task: ActivityType.TASK,
    email: ActivityType.EMAIL,
    call: ActivityType.CALL,
    meeting: ActivityType.MEETING,
    note: ActivityType.NOTE,
    invoice: ActivityType.INVOICE,
    integration: ActivityType.INTEGRATION,
    credential: ActivityType.CREDENTIAL,
    webhook: ActivityType.WEBHOOK,
    booking: ActivityType.BOOKING,
    funnel: ActivityType.FUNNEL,
    campaign: ActivityType.CAMPAIGN,
    location: ActivityType.LOCATION,
    organization: ActivityType.ORGANIZATION,
  };

  // Default to WORKFLOW for unknown types
  return entityTypeMap[entityType.toLowerCase()] || ActivityType.WORKFLOW;
}

/**
 * Re-export getChangedFields helper for convenience
 */
export { getChangedFields };
