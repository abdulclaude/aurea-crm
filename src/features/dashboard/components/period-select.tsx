"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

export function PeriodSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (days: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[2];

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="flex h-6 items-center gap-1 rounded-full border border-black/[0.07] bg-black/[0.02] px-2.5 text-[10px] font-medium text-black/50 shadow-none ring-0 hover:bg-black/[0.04] hover:text-black/70"
      >
        {current.label}
        <ChevronDown className="size-3" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[8rem] rounded-lg border border-black/[0.07] bg-white p-1 shadow-lg">
            {OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant="ghost"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full justify-start rounded-md px-2.5 py-1.5 text-[11px] shadow-none ring-0",
                  opt.value === value
                    ? "bg-black/[0.04] font-medium text-black/80"
                    : "text-black/50 hover:bg-black/[0.02] hover:text-black/70",
                )}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
