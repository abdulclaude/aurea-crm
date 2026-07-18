"use client";

import { Button } from "@/components/ui/button";
import {
  CLIENT_SEGMENTS,
  type ClientSegment,
} from "@/features/crm/clients/segments";

type ClientSegmentTabsProps = {
  onChange: (value: ClientSegment) => void;
  value: ClientSegment;
};

export function ClientSegmentTabs({ value, onChange }: ClientSegmentTabsProps) {
  return (
    <div className="overflow-x-auto border-b border-black/5 px-6 py-3 dark:border-white/5">
      <div className="flex min-w-max items-center gap-2">
        {CLIENT_SEGMENTS.map((segment) => (
          <Button
            key={segment.value}
            type="button"
            size="sm"
            variant={value === segment.value ? "gradient" : "outline"}
            className="h-7 whitespace-nowrap rounded-sm px-2.5 text-[11px] w-max"
            onClick={() => onChange(segment.value)}
          >
            {segment.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
