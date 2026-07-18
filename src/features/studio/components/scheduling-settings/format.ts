import type {
  BookingWindowPolicy,
  SchedulingPolicy,
  WaitlistPolicy,
} from "./types";

export function formatMinutes(minutes: number): string {
  const sign = minutes < 0 ? "after" : "before";
  const absolute = Math.abs(minutes);
  if (absolute % (24 * 60) === 0) {
    const days = absolute / (24 * 60);
    return `${days} ${days === 1 ? "day" : "days"} ${sign}`;
  }
  if (absolute % 60 === 0) {
    const hours = absolute / 60;
    return `${hours} ${hours === 1 ? "hour" : "hours"} ${sign}`;
  }
  return `${absolute} minutes ${sign}`;
}

export function bookingSummary(policy: BookingWindowPolicy): string {
  const values = policy.currentVersion?.values;
  if (!values) return "No version is effective yet";
  return `Opens ${formatMinutes(values.opensMinutesBeforeStart)} / closes ${formatMinutes(values.closesMinutesBeforeStart)} / cancellations close ${formatMinutes(values.cancellationsCloseMinutesBeforeStart)}`;
}

export function waitlistSummary(policy: WaitlistPolicy): string {
  const values = policy.currentVersion?.values;
  if (!values) return "No version is effective yet";
  if (values.mode === "DISABLED") return "Waitlist disabled";
  const limit =
    values.maxEntries === null
      ? "no entry limit"
      : `${values.maxEntries} entries`;
  const expiry = values.offerExpiryMinutes
    ? `${values.offerExpiryMinutes} minute offer`
    : "manual response";
  return `${modeLabel(values.mode)} / ${limit} / ${expiry}`;
}

export function policySummary(policy: SchedulingPolicy): string {
  return policy.kind === "BOOKING_WINDOW"
    ? bookingSummary(policy)
    : waitlistSummary(policy);
}

export function modeLabel(mode: string): string {
  switch (mode) {
    case "OFFER_NEXT":
      return "Offer next spot";
    case "AUTO_BOOK":
      return "Auto-book";
    case "MANUAL":
      return "Manual";
    default:
      return "Disabled";
  }
}

export function toLocalDateTime(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
