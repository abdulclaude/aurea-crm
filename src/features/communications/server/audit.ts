import "server-only";

import { createId } from "@paralleldrive/cuid2";

import { db } from "@/db";
import type { JsonValue } from "@/db/json";
import { communicationAuditEvent } from "@/db/schema";

export async function recordCommunicationAudit(input: {
  organizationId: string;
  locationId: string | null;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  safeMetadata?: Record<string, JsonValue>;
}): Promise<void> {
  await db.insert(communicationAuditEvent).values({
    id: createId(),
    organizationId: input.organizationId,
    locationId: input.locationId,
    actorUserId: input.actorUserId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    safeMetadata: input.safeMetadata ?? {},
  });
}
