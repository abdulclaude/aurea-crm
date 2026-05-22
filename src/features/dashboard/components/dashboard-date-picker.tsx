"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDate,
  type DateValue,
  fromDate,
  getLocalTimeZone,
  today,
} from "@internationalized/date";
import { CalendarDays } from "lucide-react";
import { RangeCalendar } from "@/components/ui/calendar-rac";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QuickRange = {
  label: string;
  getRange: () => { start: Date; end: Date };
};

type DashboardDatePickerProps = {
  start: Date;
  end: Date;
  onRangeChange: (start: Date, end: Date) => void;
  earliestDate?: Date | null;
  activeDates?: string[];
  className?: string;
};

function toCal(d: Date): CalendarDate {
  const z = getLocalTimeZone();
  const cd = fromDate(d, z);
  return new CalendarDate(cd.year, cd.month, cd.day);
}

function formatLabel(start: Date, end: Date) {
  const fmt = (d: Date) => {
    const mo = d.toLocaleString("en-US", { month: "short" });
    const day = d.getDate();
    const j = day % 10,
      k = day % 100;
    const suf =
      j === 1 && k !== 11
        ? "st"
        : j === 2 && k !== 12
          ? "nd"
          : j === 3 && k !== 13
            ? "rd"
            : "th";
    const yr = String(d.getFullYear()).slice(-2);
    return `${mo} ${day}${suf} '${yr}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

function clampStart(d: Date, earliest: Date | null | undefined): Date {
  if (!earliest) return d;
  return d < earliest ? earliest : d;
}

function buildQuickRanges(earliest: Date | null | undefined): QuickRange[] {
  const now = new Date();
  const nowEnd = new Date(now);
  nowEnd.setHours(23, 59, 59, 999);

  const ranges: QuickRange[] = [];

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  ranges.push({
    label: "This month",
    getRange: () => ({
      start: clampStart(thisMonthStart, earliest),
      end: nowEnd,
    }),
  });

  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  threeMonthsAgo.setHours(0, 0, 0, 0);
  if (!earliest || threeMonthsAgo >= earliest) {
    ranges.push({
      label: "Last 3 months",
      getRange: () => ({
        start: clampStart(threeMonthsAgo, earliest),
        end: nowEnd,
      }),
    });
  }

  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setHours(0, 0, 0, 0);
  if (!earliest || sixMonthsAgo >= earliest) {
    ranges.push({
      label: "Last 6 months",
      getRange: () => ({
        start: clampStart(sixMonthsAgo, earliest),
        end: nowEnd,
      }),
    });
  }

  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  oneYearAgo.setHours(0, 0, 0, 0);
  if (!earliest || oneYearAgo >= earliest) {
    ranges.push({
      label: "Last year",
      getRange: () => ({
        start: clampStart(oneYearAgo, earliest),
        end: nowEnd,
      }),
    });
  }

  const twoYearsAgo = new Date(now);
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  twoYearsAgo.setHours(0, 0, 0, 0);
  if (!earliest || twoYearsAgo >= earliest) {
    ranges.push({
      label: "Last 2 years",
      getRange: () => ({
        start: clampStart(twoYearsAgo, earliest),
        end: nowEnd,
      }),
    });
  }

  if (earliest) {
    ranges.push({
      label: "All time",
      getRange: () => {
        const s = new Date(earliest);
        s.setHours(0, 0, 0, 0);
        return { start: s, end: nowEnd };
      },
    });
  }

  return ranges;
}

export function DashboardDatePicker({
  start,
  end,
  onRangeChange,
  earliestDate,
  activeDates,
  className,
}: DashboardDatePickerProps) {
  const tz = getLocalTimeZone();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [value, setValue] = useState(() => ({
    start: toCal(start),
    end: toCal(end),
  }));

  useEffect(() => {
    const nextStart = toCal(start);
    const nextEnd = toCal(end);
    setValue((cur) => {
      if (cur.start.compare(nextStart) === 0 && cur.end.compare(nextEnd) === 0)
        return cur;
      return { start: nextStart, end: nextEnd };
    });
  }, [start, end]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const label = useMemo(
    () => formatLabel(value.start.toDate(tz), value.end.toDate(tz)),
    [value, tz],
  );

  const quickRanges = useMemo(
    () => buildQuickRanges(earliestDate),
    [earliestDate],
  );

  const minValue = useMemo(
    () => (earliestDate ? toCal(earliestDate) : undefined),
    [earliestDate],
  );
  const maxValue = useMemo(() => today(tz), [tz]);

  const activeDatesSet = useMemo(
    () => (activeDates ? new Set(activeDates) : null),
    [activeDates],
  );

  const isDateUnavailable = useCallback(
    (date: DateValue) => {
      if (!activeDatesSet) return false;
      const key = `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
      return !activeDatesSet.has(key);
    },
    [activeDatesSet],
  );

  const applyRange = (s: CalendarDate, e: CalendarDate) => {
    setValue({ start: s, end: e });
    onRangeChange(s.toDate(tz), e.toDate(tz));
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-flex w-fit shrink-0", className)}
    >
      <Button
        variant="outline"
        aria-label={`Open date range picker: ${label}`}
        className="flex h-8 cursor-pointer items-center gap-2 focus-visible:ring-2 focus-visible:ring-indigo-500/30"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 truncate">{label}</span>
      </Button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-1.5 min-w-[320px] rounded-xl border border-black/[0.07] bg-white p-3 shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
          <RangeCalendar
            value={value}
            minValue={minValue}
            maxValue={maxValue}
            isDateUnavailable={activeDatesSet ? isDateUnavailable : undefined}
            allowsNonContiguousRanges
            onChange={(range) => {
              if (!range) return;
              const r = range as { start: CalendarDate; end: CalendarDate };
              applyRange(r.start, r.end);
            }}
          />

          {quickRanges.length > 0 && (
            <div
              className="mt-3 grid gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${Math.min(quickRanges.length, 3)}, 1fr)`,
              }}
            >
              {quickRanges.map((qr) => (
                <Button
                  key={qr.label}
                  type="button"
                  variant="ghost"
                  className="w-full cursor-pointer whitespace-nowrap rounded-lg border border-black/[0.07] bg-black/[0.02] px-2.5 py-1.5 text-[11px] font-medium text-black/60 transition-colors hover:bg-black/[0.05] hover:text-black/80"
                  onClick={() => {
                    const { start: s, end: e } = qr.getRange();
                    applyRange(toCal(s), toCal(e));
                    setOpen(false);
                  }}
                >
                  {qr.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
