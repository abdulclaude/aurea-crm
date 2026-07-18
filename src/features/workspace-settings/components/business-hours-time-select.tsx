"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIME_OPTIONS = Array.from({ length: 49 }, (_, index) => ({
  value: index * 30,
  label:
    index === 48
      ? "24:00"
      : `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`,
}));

export function BusinessHoursTimeSelect(props: {
  label: string;
  value: number;
  disabled: boolean;
  minimum?: number;
  maximum?: number;
  onChange: (value: number) => void;
}): React.JSX.Element {
  return (
    <Select
      value={String(props.value)}
      disabled={props.disabled}
      onValueChange={(value) => props.onChange(Number(value))}
    >
      <SelectTrigger aria-label={props.label} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TIME_OPTIONS.filter(
          (option) =>
            option.value >= (props.minimum ?? 0) &&
            option.value <= (props.maximum ?? 1440),
        ).map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
