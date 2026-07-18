"use client";

import { DatePicker } from "@/components/ui/date-picker";
import {
  dateTimeValueTime,
  mergeDateAndTime,
  parseDateTimeValue,
} from "@/components/ui/date-picker-utils";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DateTimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  datePlaceholder?: string;
  dateAriaLabel?: string;
  timeAriaLabel?: string;
  className?: string;
  id?: string;
  ariaDescribedBy?: string;
  invalid?: boolean;
};

export function DateTimePicker({
  value,
  onChange,
  disabled,
  required,
  minDate,
  maxDate,
  datePlaceholder = "Pick a date",
  dateAriaLabel,
  timeAriaLabel,
  className,
  id,
  ariaDescribedBy,
  invalid,
}: DateTimePickerProps): React.ReactElement {
  const selectedDate = parseDateTimeValue(value);
  const selectedTime = dateTimeValueTime(value);

  return (
    <div
      className={cn("grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem]", className)}
    >
      <DatePicker
        id={id}
        date={selectedDate}
        onSelect={(date) => onChange(mergeDateAndTime(date, selectedTime))}
        placeholder={datePlaceholder}
        disabled={disabled}
        required={required}
        minDate={minDate}
        maxDate={maxDate}
        ariaLabel={dateAriaLabel}
        ariaDescribedBy={ariaDescribedBy}
        invalid={invalid}
      />
      <Input
        type="time"
        value={selectedTime}
        disabled={disabled || !selectedDate}
        required={required}
        aria-label={timeAriaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid || undefined}
        onChange={(event) =>
          onChange(mergeDateAndTime(selectedDate, event.target.value))
        }
      />
    </div>
  );
}
