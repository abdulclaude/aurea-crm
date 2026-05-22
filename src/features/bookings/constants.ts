export const BOOKING_PAGE_SIZE = 20;

export const BOOKING_STATUS_LABELS = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  RESCHEDULED: "Rescheduled",
  NO_SHOW: "No Show",
  COMPLETED: "Completed",
} as const;

export const BOOKING_LOCATION_LABELS = {
  CAL_VIDEO: "Cal.com Video",
  PHONE: "Phone Call",
  IN_PERSON: "In Person",
  GOOGLE_MEET: "Google Meet",
  ZOOM: "Zoom",
  MS_TEAMS: "Microsoft Teams",
  CUSTOM: "Custom Location",
} as const;
