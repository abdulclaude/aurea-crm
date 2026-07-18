"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarRange } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DateRangePickerProps = {
  value?: DateRange;
  onChange: (value: DateRange | undefined) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  clearable?: boolean;
};

export function DateRangePicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabled,
  placeholder = "Pick a date range",
  ariaLabel,
  className,
  clearable = true,
}: DateRangePickerProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const label = value?.from
    ? value.to
      ? `${format(value.from, "MMM d, yyyy")} - ${format(value.to, "MMM d, yyyy")}`
      : `From ${format(value.from, "MMM d, yyyy")}`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "w-full justify-start text-left text-xs font-normal",
            !value?.from && "text-muted-foreground",
            className,
          )}
        >
          <CalendarRange className="size-4" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          disabled={[
            ...(minDate ? [{ before: minDate }] : []),
            ...(maxDate ? [{ after: maxDate }] : []),
          ]}
          startMonth={minDate}
          endMonth={maxDate}
          numberOfMonths={1}
          initialFocus
        />
        {clearable && value?.from ? (
          <div className="border-t border-black/5 p-2 dark:border-white/5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
            >
              Clear dates
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
