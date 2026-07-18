"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date?: Date;
  onSelect?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  minDate?: Date;
  maxDate?: Date;
  required?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  invalid?: boolean;
}

export function DatePicker({
  date,
  onSelect,
  placeholder = "Pick a date",
  disabled,
  className,
  id,
  minDate,
  maxDate,
  required,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  invalid,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal bg-background border-black/10 dark:border-white/5 text-primary! text-xs hover:bg-primary-foreground/25 hover:text-black transition duration-150",
            !date && "text-white/50",
            className,
          )}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={ariaDescribedBy}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
        >
          <CalendarIcon className="mr-1 size-4 text-primary/75 dark:text-white/50" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-background border-black/10 dark:border-white/5"
        align="start"
      >
        <Calendar
          mode="single"
          selected={date}
          disabled={[
            ...(minDate ? [{ before: minDate }] : []),
            ...(maxDate ? [{ after: maxDate }] : []),
          ]}
          startMonth={minDate}
          endMonth={maxDate}
          onSelect={(newDate) => {
            onSelect?.(newDate);
            if (newDate) {
              setOpen(false);
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
