import type { inferRouterOutputs } from "@trpc/server";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";

import { ExecutionStatus } from "@/db/enums";
import type { AppRouter } from "@/trpc/routers/_app";
import {
  ExecutionStatusBadge,
  formatExecutionDuration,
} from "./execution-status-badge";

type ExecutionRun =
  inferRouterOutputs<AppRouter>["executions"]["getMany"]["items"][number];

export function ExecutionRunRow({ item }: { item: ExecutionRun }) {
  const skipped = executionWasSkipped(item.output);
  return (
    <Link
      href={`/executions/${item.id}`}
      className="group grid min-h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 transition-colors hover:bg-primary-foreground/25 md:grid-cols-[minmax(220px,1.5fr)_140px_150px_110px_28px] md:px-5"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-primary">
            {item.Workflows.name}
          </span>
          {item.status === ExecutionStatus.FAILED && item.error ? (
            <span className="hidden truncate text-xs text-rose-600/75 lg:inline">
              {item.error}
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate font-mono text-[10px] text-primary/40">
          {item.id}
        </p>
      </div>
      <div className="md:hidden">
        <ExecutionStatusBadge status={item.status} skipped={skipped} />
      </div>
      <div className="hidden md:block">
        <ExecutionStatusBadge status={item.status} skipped={skipped} />
      </div>
      <div className="hidden md:block">
        <p className="text-xs text-primary/75">
          {format(new Date(item.startedAt), "d MMM, HH:mm")}
        </p>
        <p className="mt-1 text-[11px] text-primary/40">
          {formatDistanceToNow(new Date(item.startedAt), { addSuffix: true })}
        </p>
      </div>
      <p className="hidden text-xs tabular-nums text-primary/65 md:block">
        {formatExecutionDuration(item.startedAt, item.completedAt)}
      </p>
      <ArrowUpRightIcon className="hidden size-4 text-primary/30 transition group-hover:text-primary md:block" />
    </Link>
  );
}

function executionWasSkipped(output: unknown): boolean {
  return (
    typeof output === "object" &&
    output !== null &&
    !Array.isArray(output) &&
    "skipped" in output &&
    output.skipped === true
  );
}
