import { createHash, timingSafeEqual } from "node:crypto";

import { z } from "zod";

export const googleCalendarEventSchema = z
  .object({
    id: z.string().min(1),
    status: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
  })
  .passthrough();

export type GoogleCalendarEvent = z.infer<typeof googleCalendarEventSchema>;

export const googleCalendarEventsPageSchema = z.object({
  items: z.array(googleCalendarEventSchema).default([]),
  nextPageToken: z.string().optional(),
  nextSyncToken: z.string().optional(),
});

export const googleCalendarWatchSchema = z.object({
  resourceId: z.string().min(1),
  expiration: z.union([z.string(), z.number()]).optional(),
});

export type GoogleCalendarEventType = "created" | "updated" | "deleted";

export function hashWebhookSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function webhookSecretMatches(
  secret: string,
  expectedHash: string,
): boolean {
  const actual = Buffer.from(hashWebhookSecret(secret), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function isNewGoogleMessageNumber(
  incoming: string,
  previous: string | null,
): boolean {
  if (!/^\d+$/.test(incoming)) return false;
  if (!previous || !/^\d+$/.test(previous)) return true;
  return BigInt(incoming) > BigInt(previous);
}

export function resolveCalendarEventType(
  event: GoogleCalendarEvent,
): GoogleCalendarEventType {
  if (event.status === "cancelled") return "deleted";

  const created = event.created ? Date.parse(event.created) : Number.NaN;
  const updated = event.updated ? Date.parse(event.updated) : Number.NaN;
  return !Number.isNaN(created) &&
    !Number.isNaN(updated) &&
    updated > created
    ? "updated"
    : "created";
}

export function normalizeCalendarEvents(
  values?: string[],
): GoogleCalendarEventType[] {
  const allowed = new Set<GoogleCalendarEventType>([
    "created",
    "updated",
    "deleted",
  ]);
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value.toLowerCase())
        .filter((value): value is GoogleCalendarEventType =>
          allowed.has(value as GoogleCalendarEventType),
        ),
    ),
  );
}

export function sanitizeVariableName(value?: string | null): string {
  const trimmed = value?.trim() ?? "";
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)
    ? trimmed
    : "googleCalendar";
}
