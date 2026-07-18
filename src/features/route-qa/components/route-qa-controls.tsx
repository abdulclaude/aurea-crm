"use client";

import {
  CheckCircle2,
  Circle,
  ListFilter,
  MessageSquareText,
  RotateCcw,
  Search,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RouteQaFilter } from "@/features/route-qa/types";
import { cn } from "@/lib/utils";

type RouteQaControlsProps = {
  query: string;
  filter: RouteQaFilter;
  completedCount: number;
  noteCount: number;
  onQueryChange: (value: string) => void;
  onFilterChange: (value: RouteQaFilter) => void;
  onResetProgress: () => void;
};

const FILTERS = [
  ["all", "All", ListFilter],
  ["remaining", "Remaining", Circle],
  ["completed", "Completed", CheckCircle2],
  ["noted", "With notes", MessageSquareText],
] as const;

export function RouteQaControls({
  query,
  filter,
  completedCount,
  noteCount,
  onQueryChange,
  onFilterChange,
  onResetProgress,
}: RouteQaControlsProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-primary/40" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search routes, test steps, and notes"
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(([value, label, Icon]) => (
          <Button
            key={value}
            type="button"
            variant={filter === value ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onFilterChange(value)}
            className={cn(filter === value && "ring ring-black/10")}
          >
            <Icon />
            {label}
            {value === "noted" && noteCount > 0 && (
              <span className="tabular-nums text-primary/55">{noteCount}</span>
            )}
          </Button>
        ))}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={completedCount === 0}
            >
              <RotateCcw />
              Reset
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset route progress?</AlertDialogTitle>
              <AlertDialogDescription>
                This clears every completed checkmark in this browser. Route
                notes are retained.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onResetProgress}>
                Reset progress
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
