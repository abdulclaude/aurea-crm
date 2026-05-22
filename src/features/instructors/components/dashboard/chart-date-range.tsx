"use client";

import { format, subDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DateRange } from "react-day-picker";

type Preset = "30d" | "90d" | "6m" | "1y" | "custom";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "6m", label: "6m" },
  { key: "1y", label: "1y" },
];

function presetRange(preset: Preset): { from: Date; to: Date } {
  const to = new Date();
  switch (preset) {
    case "30d":
      return { from: subDays(to, 30), to };
    case "90d":
      return { from: subDays(to, 90), to };
    case "6m":
      return { from: subDays(to, 180), to };
    case "1y":
      return { from: subDays(to, 365), to };
    default:
      return { from: subDays(to, 30), to };
  }
}

export function ChartDateRange({
  onChange,
  defaultPreset = "30d",
}: {
  onChange: (range: { from: Date; to: Date }) => void;
  defaultPreset?: Preset;
}) {
  const [active, setActive] = useState<Preset>(defaultPreset);
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [popoverOpen, setPopoverOpen] = useState(false);

  function handlePreset(preset: Preset) {
    setActive(preset);
    onChange(presetRange(preset));
  }

  function handleCustomSelect(range: DateRange | undefined) {
    setCustomRange(range);
    if (range?.from && range?.to) {
      setActive("custom");
      onChange({ from: range.from, to: range.to });
      setPopoverOpen(false);
    }
  }

  const customLabel =
    active === "custom" && customRange?.from && customRange?.to
      ? `${format(customRange.from, "MMM d")} – ${format(customRange.to, "MMM d")}`
      : null;

  return (
    <div className="flex items-center gap-0.5">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => handlePreset(p.key)}
          className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
            active === p.key
              ? "bg-black/[0.07] text-black/70"
              : "text-black/30 hover:text-black/50"
          }`}
        >
          {p.label}
        </button>
      ))}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
              active === "custom"
                ? "bg-black/[0.07] text-black/70"
                : "text-black/30 hover:text-black/50"
            }`}
          >
            <CalendarIcon className="size-3" />
            {customLabel ?? "Custom"}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 bg-white border-black/10"
          align="end"
        >
          <Calendar
            mode="range"
            selected={customRange}
            onSelect={handleCustomSelect}
            numberOfMonths={2}
            defaultMonth={subDays(new Date(), 30)}
            disabled={{ after: new Date() }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
