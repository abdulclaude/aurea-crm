import "server-only";

import { and, eq, inArray, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { bookingEventType, calComCredential } from "@/db/schema";
import type { PublishedBookingWidgetSource } from "@/features/publications/public/contracts";

export async function bookingWidgetSourceIsCurrent(input: {
  organizationId: string;
  locationId: string;
  source: PublishedBookingWidgetSource;
}): Promise<boolean> {
  const ids = input.source.events.map((event) => event.id);
  const rows = await db
    .select({
      id: bookingEventType.id,
      title: bookingEventType.title,
      description: bookingEventType.description,
      length: bookingEventType.length,
      locationType: bookingEventType.locationType,
      calEventTypeId: bookingEventType.calEventTypeId,
      calComCredentialId: bookingEventType.calComCredentialId,
      calUsername: calComCredential.calUsername,
      slug: bookingEventType.slug,
    })
    .from(bookingEventType)
    .innerJoin(
      calComCredential,
      and(
        eq(calComCredential.id, bookingEventType.calComCredentialId),
        eq(calComCredential.organizationId, bookingEventType.organizationId),
        eq(calComCredential.locationId, bookingEventType.locationId),
      ),
    )
    .where(
      and(
        inArray(bookingEventType.id, ids),
        eq(bookingEventType.organizationId, input.organizationId),
        eq(bookingEventType.locationId, input.locationId),
        eq(bookingEventType.isActive, true),
        eq(bookingEventType.isTeamEvent, false),
        eq(bookingEventType.requiresPayment, false),
        eq(bookingEventType.requiresConfirmation, false),
        isNotNull(bookingEventType.calEventTypeId),
        isNotNull(bookingEventType.calComCredentialId),
        eq(calComCredential.isActive, true),
        isNotNull(calComCredential.apiKey),
        isNotNull(calComCredential.calUsername),
      ),
    );
  if (rows.length !== input.source.events.length) return false;
  const liveById = new Map(rows.map((row) => [row.id, row]));
  return input.source.events.every((event) => {
    const live = liveById.get(event.id);
    return Boolean(
      live &&
        live.calEventTypeId === event.calEventTypeId &&
        live.calComCredentialId === event.calComCredentialId &&
        live.calUsername === event.calUsername &&
        live.slug === event.slug &&
        live.title.slice(0, 160) === event.title &&
        (input.source.widget.config.showDescription
          ? (live.description?.slice(0, 2_000) ?? null) === event.description
          : event.description === null) &&
        live.length === event.length &&
        live.locationType === event.locationType,
    );
  });
}
