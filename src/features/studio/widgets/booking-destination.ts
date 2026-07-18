import { z } from "zod";

const calPathSegmentSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9._-]+$/);

export function buildCalBookingDestination(input: {
  username: string;
  eventSlug: string;
}): string {
  const username = calPathSegmentSchema.parse(input.username);
  const eventSlug = calPathSegmentSchema.parse(input.eventSlug);
  const url = new URL("https://cal.com");
  url.pathname = `/${encodeURIComponent(username)}/${encodeURIComponent(eventSlug)}`;
  return url.toString();
}

export const calBookingPathSegmentSchema = calPathSegmentSchema;
