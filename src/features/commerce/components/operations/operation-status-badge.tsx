import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { humanizeOperationLabel } from "./formatters";

const STATUS_STYLES: Record<string, string> = {
  SUCCEEDED: "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400",
  PROCESSED: "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400",
  WON: "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400",
  PENDING: "bg-amber-50 text-amber-700 ring-amber-500/20 dark:text-amber-400",
  RECEIVED: "bg-sky-50 text-sky-700 ring-sky-500/20 dark:text-sky-400",
  PROCESSING: "bg-sky-50 text-sky-700 ring-sky-500/20 dark:text-sky-400",
  RUNNING: "bg-sky-50 text-sky-700 ring-sky-500/20 dark:text-sky-400",
  ACKNOWLEDGED: "bg-sky-50 text-sky-700 ring-sky-500/20 dark:text-sky-400",
  FAILED: "bg-rose-50 text-rose-700 ring-rose-500/20 dark:text-rose-400",
  DEAD_LETTER: "bg-rose-50 text-rose-700 ring-rose-500/20 dark:text-rose-400",
  CRITICAL: "bg-rose-50 text-rose-700 ring-rose-500/20 dark:text-rose-400",
  OPEN: "bg-amber-50 text-amber-700 ring-amber-500/20 dark:text-amber-400",
  WARNING: "bg-amber-50 text-amber-700 ring-amber-500/20 dark:text-amber-400",
  RESOLVED: "bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400",
  INFO: "bg-sky-50 text-sky-700 ring-sky-500/20 dark:text-sky-400",
  IGNORED: "bg-primary/[0.03] text-primary/50 ring-primary/10",
  CANCELLED: "bg-primary/[0.03] text-primary/50 ring-primary/10",
};

export function OperationStatusBadge({ value }: { value: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] dark:bg-white/5",
        STATUS_STYLES[value] ?? "bg-primary/[0.03] text-primary/60 ring-primary/10",
      )}
    >
      {humanizeOperationLabel(value)}
    </Badge>
  );
}
