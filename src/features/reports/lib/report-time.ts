export function formatReportDateInTimezone(
  value: Date | null | undefined,
  timezone: string,
): string | null {
  if (!value) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return values.year && values.month && values.day
    ? `${values.year}-${values.month}-${values.day}`
    : null;
}

export function reportBucketKey(input: {
  value: Date;
  timezone: string;
  weekStart: "SUNDAY" | "MONDAY" | "SATURDAY";
  groupBy: "day" | "week" | "month";
}): string {
  const dateKey = formatReportDateInTimezone(input.value, input.timezone);
  if (!dateKey) return "";
  if (input.groupBy === "day") return dateKey;
  if (input.groupBy === "month") return dateKey.slice(0, 7);

  const weekStartIndex = { SUNDAY: 0, MONDAY: 1, SATURDAY: 6 }[
    input.weekStart
  ];
  const localDate = new Date(`${dateKey}T00:00:00.000Z`);
  const daysSinceStart = (localDate.getUTCDay() - weekStartIndex + 7) % 7;
  localDate.setUTCDate(localDate.getUTCDate() - daysSinceStart);
  return localDate.toISOString().slice(0, 10);
}
