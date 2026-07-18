"use client";

import { RangeCalendar } from "@/components/ui/calendar-rac";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDate,
  fromDate,
  getLocalTimeZone,
} from "@internationalized/date";

type Props = {
  minDate: Date;
  maxDate: Date;
  defaultStart?: Date;
  defaultEnd?: Date;
  valueStart?: Date;
  valueEnd?: Date;
  onChange?: (start: Date, end: Date) => void;
  className?: string;
};

function toCal(d: Date): CalendarDate {
  const z = getLocalTimeZone();
  const cd = fromDate(d, z);
  return new CalendarDate(cd.year, cd.month, cd.day);
}

export default function DateRangeFilter({
  minDate,
  maxDate,
  defaultStart,
  defaultEnd,
  valueStart,
  valueEnd,
  onChange,
  className,
}: Props) {
  const minValue = useMemo(() => toCal(minDate), [minDate]);
  const maxValue = useMemo(() => toCal(maxDate), [maxDate]);
  const initialStart = defaultStart || minDate;
  const initialEnd = defaultEnd || maxDate;

  const [value, setValue] = useState<{
    start: CalendarDate;
    end: CalendarDate;
  }>(() => ({ start: toCal(initialStart), end: toCal(initialEnd) }));

  // external sync
  useEffect(() => {
    if (valueStart && valueEnd) {
      const vs = toCal(valueStart);
      const ve = toCal(valueEnd);
      if (value.start.compare(vs) !== 0 || value.end.compare(ve) !== 0) {
        setValue({ start: vs, end: ve });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueStart?.getTime(), valueEnd?.getTime()]);

  const lastSentRef = useRef<{ s: string; e: string } | null>(null);

  return (
    <div
      className={cn(
        "*:not-first:mt-2 flex items-center justify-center",
        className,
      )}
    >
      <RangeCalendar
        minValue={minValue}
        maxValue={maxValue}
        className="w-full"
        isDateUnavailable={(d) =>
          d.compare(minValue) < 0 || d.compare(maxValue) > 0
        }
        value={value}
        onChange={(range) => {
          if (!range) return;
          let start = new CalendarDate(
            range.start.year,
            range.start.month,
            range.start.day,
          );
          let end = new CalendarDate(
            range.end.year,
            range.end.month,
            range.end.day,
          );
          if (start.compare(minValue) < 0) start = minValue;
          if (end.compare(maxValue) > 0) end = maxValue;
          if (start.compare(end) > 0) {
            const tmp = start;
            start = end;
            end = tmp;
          }
          setValue({ start, end });
          const sJs = start.toDate(getLocalTimeZone());
          const eJs = end.toDate(getLocalTimeZone());
          const next = { s: start.toString(), e: end.toString() };
          if (
            !lastSentRef.current ||
            lastSentRef.current.s !== next.s ||
            lastSentRef.current.e !== next.e
          ) {
            lastSentRef.current = next;
            onChange?.(sJs, eJs);
          }
        }}
      />
    </div>
  );
}
