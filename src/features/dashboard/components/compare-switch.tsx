"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDashboardComparison } from "@/stores/dashboard-comparison";
import { formatPreviousRangeLabel } from "@/features/dashboard/comparison-utils";
import { cn } from "@/lib/utils";

export function CompareSwitch({
  ownerId,
  range,
}: {
  ownerId: string;
  range: { start: Date; end: Date };
}) {
  const setComparison = useDashboardComparison((s) => s.setComparison);
  const comparisons = useDashboardComparison((s) => s.comparisons);
  const myMode = comparisons[ownerId] ?? "none";
  const checked = myMode !== "none";

  const previousRangeLabel = useMemo(
    () => formatPreviousRangeLabel(range),
    [range],
  );

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  if (checked) {
    return (
      <div
        className="flex h-6 shrink-0 items-center gap-1 rounded-full border border-indigo-500/15 bg-indigo-500/[0.06] py-0.5 pr-0.5 pl-2.5 text-[10px] font-medium text-indigo-700"
        onPointerDown={stop}
      >
        <span className="whitespace-nowrap">{previousRangeLabel}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Remove ${previousRangeLabel} comparison`}
          className="size-4 rounded-full text-indigo-700/60 shadow-none ring-0 hover:bg-indigo-500/10 hover:text-indigo-800"
          onPointerDown={stop}
          onClick={(e) => {
            stop(e);
            setComparison(ownerId, "none");
          }}
        >
          <X className="size-3" />
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <div
        className="inline-flex shrink-0 items-center gap-1.5"
        onPointerDown={stop}
      >
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "flex h-6 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-black/[0.07] bg-black/[0.02] px-1.5 pr-2.5 text-[10px] font-medium shadow-none ring-0 transition-all hover:bg-black/[0.04]",
              checked ? "text-black/70" : "text-black/45",
            )}
            onClick={stop}
          >
            <span
              aria-hidden="true"
              className={cn(
                "relative inline-flex h-3.5 w-7 shrink-0 rounded-full transition-colors duration-300",
                checked ? "bg-indigo-500" : "bg-black/10",
              )}
            >
              <span
                className={cn(
                  "absolute top-1/2 left-0.5 size-2.5 -translate-y-1/2 rounded-full bg-white shadow-xs transition-transform duration-300",
                  checked ? "translate-x-[13px]" : "translate-x-0",
                )}
              />
            </span>
            <span>Compare</span>
          </Button>
        </DropdownMenuTrigger>
      </div>

      <DropdownMenuContent
        align="start"
        className="mt-1 w-max min-w-56 rounded-lg"
        onPointerDown={stop}
        onClick={stop}
      >
        <DropdownMenuLabel className="text-[11px] font-normal text-black/40">
          Compare with
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="w-max min-w-full whitespace-nowrap"
          onSelect={() => setComparison(ownerId, "previous")}
        >
          {previousRangeLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
