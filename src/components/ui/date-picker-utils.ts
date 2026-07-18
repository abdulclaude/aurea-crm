import { format } from "date-fns";

const DATE_VALUE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_VALUE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function validLocalDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date | undefined {
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute
    ? date
    : undefined;
}

export function parseDateValue(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const match = DATE_VALUE_PATTERN.exec(value.slice(0, 10));
  if (!match) return undefined;
  return validLocalDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function formatDateValue(date?: Date): string {
  return date ? format(date, "yyyy-MM-dd") : "";
}

export function parseDateTimeValue(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const match = DATE_TIME_VALUE_PATTERN.exec(value.slice(0, 16));
  if (!match) return undefined;
  return validLocalDate(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );
}

export function formatDateTimeValue(date?: Date): string {
  return date ? format(date, "yyyy-MM-dd'T'HH:mm") : "";
}

export function dateTimeValueTime(value?: string | null): string {
  return parseDateTimeValue(value) ? (value?.slice(11, 16) ?? "") : "";
}

export function mergeDateAndTime(date: Date | undefined, time: string): string {
  if (!date) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const next = new Date(date);
  next.setHours(
    Number.isInteger(hours) ? hours : 0,
    Number.isInteger(minutes) ? minutes : 0,
    0,
    0,
  );
  return formatDateTimeValue(next);
}
