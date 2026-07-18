export function workspaceWeekStartIndex(
  value: "SUNDAY" | "MONDAY" | "SATURDAY" | undefined,
): 0 | 1 | 6 {
  if (value === "SUNDAY") return 0;
  if (value === "SATURDAY") return 6;
  return 1;
}

export function calendarTimeBounds(input: {
  startMinutes?: number;
  endMinutes?: number;
  events: readonly { start: Date; end: Date }[];
}): { startHour: number; endHour: number } {
  const configuredStart = Math.floor((input.startMinutes ?? 7 * 60) / 60);
  const configuredEnd = Math.ceil((input.endMinutes ?? 22 * 60) / 60);
  if (input.events.length === 0) {
    return { startHour: configuredStart, endHour: configuredEnd };
  }
  let earliestHour = 23;
  let latestHour = 1;
  for (const event of input.events) {
    earliestHour = Math.min(earliestHour, event.start.getHours());
    latestHour = Math.max(
      latestHour,
      event.end.getHours() + (event.end.getMinutes() > 0 ? 1 : 0),
    );
  }
  return {
    startHour: Math.max(0, Math.min(configuredStart, earliestHour - 1)),
    endHour: Math.min(24, Math.max(configuredEnd, latestHour)),
  };
}
