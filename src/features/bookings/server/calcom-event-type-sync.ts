import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import type { BookingLocationType } from "@/db/enums";
import { bookingEventType, calComCredential } from "@/db/schema";
import { getCalComClient } from "@/lib/calcom";

const calEventTypeSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  slug: z.string(),
  description: z.string().optional().nullable(),
  length: z.number().int().positive(),
  hidden: z.boolean().optional(),
  locations: z.array(z.object({ type: z.string().optional() })).optional(),
});

const responseSchema = z.union([
  z.object({ data: z.array(calEventTypeSchema) }),
  z.array(calEventTypeSchema),
]);

export async function syncCalComEventTypes(input: {
  credentialId: string;
  encryptedApiKey: string;
  organizationId: string;
  locationId: string;
}): Promise<{ synced: number; created: number; updated: number }> {
  const calClient = await getCalComClient(input.encryptedApiKey);
  const response: unknown = await calClient.getEventTypes();
  const parsed = responseSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error("Cal.com returned an unsupported event type response.");
  }
  const eventTypes = Array.isArray(parsed.data)
    ? parsed.data
    : parsed.data.data;
  if (eventTypes.length === 0) {
    throw new Error("Cal.com returned no event types for this account.");
  }

  const existingRows = await db.query.bookingEventType.findMany({
    where: and(
      eq(bookingEventType.calComCredentialId, input.credentialId),
      eq(bookingEventType.organizationId, input.organizationId),
      eq(bookingEventType.locationId, input.locationId),
    ),
    columns: { id: true, calEventTypeId: true },
  });
  const byRemoteId = new Map(
    existingRows
      .filter((row) => row.calEventTypeId !== null)
      .map((row) => [row.calEventTypeId as number, row.id]),
  );
  let created = 0;
  let updated = 0;
  const now = new Date();

  await db.transaction(async (tx) => {
    for (const remote of eventTypes) {
      const values = {
        title: remote.title,
        slug: remote.slug,
        description: remote.description ?? null,
        length: remote.length,
        locationType: mapCalLocationType(remote.locations?.[0]?.type),
        isActive: !remote.hidden,
        lastSyncedAt: now,
        updatedAt: now,
      };
      const existingId = byRemoteId.get(remote.id);
      if (existingId) {
        await tx
          .update(bookingEventType)
          .set(values)
          .where(
            and(
              eq(bookingEventType.id, existingId),
              eq(bookingEventType.calComCredentialId, input.credentialId),
              eq(bookingEventType.organizationId, input.organizationId),
              eq(bookingEventType.locationId, input.locationId),
            ),
          );
        updated += 1;
      } else {
        await tx.insert(bookingEventType).values({
          id: randomUUID(),
          organizationId: input.organizationId,
          locationId: input.locationId,
          calComCredentialId: input.credentialId,
          calEventTypeId: remote.id,
          ...values,
        });
        created += 1;
      }
    }

    await tx
      .update(calComCredential)
      .set({ lastSyncedAt: now, lastError: null, updatedAt: now })
      .where(
        and(
          eq(calComCredential.id, input.credentialId),
          eq(calComCredential.organizationId, input.organizationId),
          eq(calComCredential.locationId, input.locationId),
        ),
      );
  });

  return { synced: eventTypes.length, created, updated };
}

function mapCalLocationType(type: string | undefined): BookingLocationType {
  if (type === "integrations:daily") return "CAL_VIDEO";
  if (type === "integrations:google:meet") return "GOOGLE_MEET";
  if (type === "integrations:zoom") return "ZOOM";
  if (type === "integrations:office365_video") return "MS_TEAMS";
  if (type === "phone") return "PHONE";
  if (type === "inPerson") return "IN_PERSON";
  return "CUSTOM";
}
