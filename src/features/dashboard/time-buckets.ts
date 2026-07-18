export type DashboardTimeGranularity = "day" | "week" | "month";

function isoDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getDashboardBucketKey(
  date: Date,
  granularity: DashboardTimeGranularity,
): string {
  if (granularity === "month") return isoDateKey(date).slice(0, 7);
  if (granularity === "day") return isoDateKey(date);

  const weekStart = new Date(date);
  const daysSinceMonday = (weekStart.getUTCDay() + 6) % 7;
  weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - daysSinceMonday);
  return isoDateKey(weekStart);
}

export function getDashboardBucketKeys(
  start: Date,
  end: Date,
  granularity: DashboardTimeGranularity,
): string[] {
  if (start >= end) return [];

  if (granularity === "day") {
    const keys: string[] = [];
    const cursor = new Date(start);
    cursor.setUTCHours(0, 0, 0, 0);
    while (cursor < end) {
      keys.push(getDashboardBucketKey(cursor, granularity));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return keys;
  }

  const keys: string[] = [];
  const seen = new Set<string>();
  const cursor = new Date(start);
  cursor.setUTCHours(0, 0, 0, 0);
  while (cursor < end) {
    const key = getDashboardBucketKey(cursor, granularity);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
    cursor.setUTCDate(
      cursor.getUTCDate() + (granularity === "week" ? 7 : 28),
    );
  }

  const lastKey = getDashboardBucketKey(
    new Date(end.getTime() - 1),
    granularity,
  );
  if (!seen.has(lastKey)) keys.push(lastKey);
  return keys;
}

export function formatDashboardXAxisLabel(
  key: string,
  granularity: DashboardTimeGranularity,
): string {
  if (granularity === "month") {
    const [year, month] = key.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString("en-GB", {
      month: "short",
      year: "2-digit",
    });
  }

  const date = new Date(`${key}T00:00:00`);
  return date.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  });
}
