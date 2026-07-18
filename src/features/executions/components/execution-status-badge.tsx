import {
  CheckCircle2Icon,
  CircleSlash2Icon,
  Loader2Icon,
  XCircleIcon,
} from "lucide-react";

import { ExecutionStatus, type ExecutionStatus as Status } from "@/db/enums";
import { cn } from "@/lib/utils";

const statusMeta = {
  [ExecutionStatus.SUCCESS]: {
    label: "Succeeded",
    icon: CheckCircle2Icon,
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  [ExecutionStatus.FAILED]: {
    label: "Failed",
    icon: XCircleIcon,
    className:
      "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  [ExecutionStatus.RUNNING]: {
    label: "Running",
    icon: Loader2Icon,
    className: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
} satisfies Record<
  Status,
  { label: string; icon: typeof CheckCircle2Icon; className: string }
>;

export function formatExecutionDuration(
  startedAt: string | Date,
  completedAt: string | Date | null,
) {
  if (!completedAt) return "In progress";
  const milliseconds = Math.max(
    0,
    new Date(completedAt).getTime() - new Date(startedAt).getTime(),
  );
  if (milliseconds < 1_000) return `${milliseconds}ms`;

  const seconds = Math.round(milliseconds / 1_000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function ExecutionStatusBadge({
  status,
  skipped = false,
}: {
  status: Status;
  skipped?: boolean;
}) {
  if (skipped) {
    return (
      <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-muted-foreground">
        <CircleSlash2Icon className="size-3.5" aria-hidden="true" />
        Skipped
      </span>
    );
  }
  const meta = statusMeta[status];
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium",
        meta.className,
      )}
    >
      <Icon
        className={cn(
          "size-3.5",
          status === ExecutionStatus.RUNNING && "animate-spin",
        )}
      />
      {meta.label}
    </span>
  );
}
