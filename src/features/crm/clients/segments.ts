export const CLIENT_SEGMENT_VALUES = [
  "all",
  "no-purchases-or-reservations",
  "intro-offer",
  "membership-last-7-days",
  "member",
  "active-member",
  "retention",
  "first-class-booked",
] as const;

export type ClientSegment = (typeof CLIENT_SEGMENT_VALUES)[number];

export const CLIENT_SEGMENTS = [
  { value: "all", label: "All" },
  {
    value: "no-purchases-or-reservations",
    label: "No purchases or reservations",
  },
  { value: "intro-offer", label: "Intro offer" },
  {
    value: "membership-last-7-days",
    label: "Bought membership in the last 7 days",
  },
  { value: "member", label: "Member" },
  { value: "active-member", label: "Active member" },
  { value: "retention", label: "Retention" },
  { value: "first-class-booked", label: "First class booked" },
] as const satisfies ReadonlyArray<{ value: ClientSegment; label: string }>;

export function isClientSegment(value: string): value is ClientSegment {
  return CLIENT_SEGMENT_VALUES.some((segment) => segment === value);
}
