import type {
  RequiredWorkspaceOperationsValues,
  WorkspaceBusinessHours,
} from "@/features/workspace-settings/operations-contracts";

const WEEKDAY_BY_LONG_NAME = {
  Monday: "MONDAY",
  Tuesday: "TUESDAY",
  Wednesday: "WEDNESDAY",
  Thursday: "THURSDAY",
  Friday: "FRIDAY",
  Saturday: "SATURDAY",
  Sunday: "SUNDAY",
} as const;

type LocalTime = {
  day: keyof WorkspaceBusinessHours;
  daySerial: number;
  minutes: number;
};

function localTime(date: Date, timezone: string): LocalTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";
  const weekday = value("weekday") as keyof typeof WEEKDAY_BY_LONG_NAME;
  return {
    day: WEEKDAY_BY_LONG_NAME[weekday],
    daySerial: Math.floor(
      Date.UTC(Number(value("year")), Number(value("month")) - 1, Number(value("day"))) /
        86_400_000,
    ),
    minutes: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

export function bookingFitsBusinessHours(input: {
  start: Date;
  end: Date;
  timezone: string;
  businessHours: WorkspaceBusinessHours;
}): boolean {
  if (input.end <= input.start) return false;
  const start = localTime(input.start, input.timezone);
  const end = localTime(input.end, input.timezone);
  const endMinutes =
    end.daySerial === start.daySerial
      ? end.minutes
      : end.daySerial === start.daySerial + 1 && end.minutes === 0
        ? 1440
        : null;
  if (endMinutes === null) return false;
  return input.businessHours[start.day].some(
    (interval) =>
      start.minutes >= interval.opensAtMinutes &&
      endMinutes <= interval.closesAtMinutes,
  );
}

export function guestBookingPolicyError(input: {
  guestCount: number;
  settings: RequiredWorkspaceOperationsValues;
}): string | null {
  if (input.guestCount === 0) return null;
  if (!input.settings.guestBookingEnabled) {
    return "Guest bookings are disabled for this workspace.";
  }
  if (input.guestCount > input.settings.maxGuestsPerBooking) {
    return `This booking allows at most ${input.settings.maxGuestsPerBooking} guests.`;
  }
  return null;
}
