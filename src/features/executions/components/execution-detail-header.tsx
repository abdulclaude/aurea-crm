import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  Clock3Icon,
  ExternalLinkIcon,
  FingerprintIcon,
  Loader2Icon,
  TimerIcon,
  WorkflowIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ExecutionStatus, type ExecutionStatus as Status } from "@/db/enums";
import { cn } from "@/lib/utils";
import type { ExecutionDetail } from "./execution-detail-types";

function getStatusMeta(status: Status) {
  switch (status) {
    case ExecutionStatus.SUCCESS:
      return {
        label: "Succeeded",
        description: "The workflow completed without errors.",
        icon: CheckCircle2Icon,
        className:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      };
    case ExecutionStatus.FAILED:
      return {
        label: "Failed",
        description: "The workflow stopped before it could complete.",
        icon: XCircleIcon,
        className:
          "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      };
    case ExecutionStatus.RUNNING:
      return {
        label: "Running",
        description: "This page updates automatically while the workflow runs.",
        icon: Loader2Icon,
        className:
          "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      };
  }
}

function formatLiveDuration(startedAt: Date, completedAt: Date | null) {
  const end = completedAt?.getTime() ?? Date.now();
  const milliseconds = Math.max(0, end - startedAt.getTime());
  if (milliseconds < 1_000) return `${milliseconds}ms`;

  const seconds = Math.round(milliseconds / 1_000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function ExecutionDetailHeader({
  execution,
}: {
  execution: ExecutionDetail;
}) {
  const statusMeta = getStatusMeta(execution.status);
  const StatusIcon = statusMeta.icon;

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-black/5 px-4 py-5 dark:border-white/5 md:px-6">
        <Link
          href="/executions"
          className="inline-flex w-max items-center gap-1.5 text-xs text-primary/50 transition hover:text-primary"
        >
          <ArrowLeftIcon className="size-3.5" />
          All executions
        </Link>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-lg border",
                statusMeta.className,
              )}
            >
              <StatusIcon
                className={cn(
                  "size-5",
                  execution.status === ExecutionStatus.RUNNING && "animate-spin",
                )}
              />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold text-primary">
                  {execution.Workflows.name}
                </h1>
                <span
                  className={cn(
                    "rounded-lg border px-2 py-1 text-[10px] font-medium uppercase",
                    statusMeta.className,
                  )}
                >
                  {statusMeta.label}
                </span>
              </div>
              <p className="mt-1 text-xs text-primary/50">
                {statusMeta.description}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="w-max rounded-lg">
            <Link href={`/workflows/${execution.workflowId}`}>
              <WorkflowIcon className="size-3.5" />
              Open workflow
              <ExternalLinkIcon className="size-3" />
            </Link>
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 border-b border-black/5 dark:border-white/5 lg:grid-cols-4">
        <DetailMetric
          icon={Clock3Icon}
          label="Started"
          value={format(execution.startedAt, "d MMM yyyy, HH:mm:ss")}
          detail={formatDistanceToNow(execution.startedAt, { addSuffix: true })}
        />
        <DetailMetric
          icon={TimerIcon}
          label="Duration"
          value={formatLiveDuration(execution.startedAt, execution.completedAt)}
          detail={execution.completedAt ? "Completed run" : "Still running"}
        />
        <DetailMetric
          icon={WorkflowIcon}
          label="Workflow"
          value={execution.Workflows.name}
          detail="Open definition to make changes"
        />
        <DetailMetric
          icon={FingerprintIcon}
          label="Execution ID"
          value={execution.id.slice(0, 12)}
          detail="Unique run identifier"
          mono
        />
      </div>
    </>
  );
}

function DetailMetric({
  icon: Icon,
  label,
  value,
  detail,
  mono = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 border-r border-black/5 px-4 py-4 last:border-r-0 dark:border-white/5 md:px-6">
      <div className="flex items-center gap-1.5 text-[11px] text-primary/45">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p
        className={cn(
          "mt-2 truncate text-sm font-medium text-primary",
          mono && "font-mono",
        )}
      >
        {value}
      </p>
      <p className="mt-1 truncate text-[10px] text-primary/35">{detail}</p>
    </div>
  );
}
