"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import * as React from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  RECONCILIATION_RUN_STATUS_VALUES,
  reconciliationRunStatusSchema,
} from "@/features/commerce/reconciliation-contracts";
import { useTRPC } from "@/trpc/client";

import { formatOperationDate, humanizeOperationLabel } from "./formatters";
import { OperationStatusBadge } from "./operation-status-badge";
import { OperationsPagination } from "./operations-pagination";
import { OperationsTableState } from "./operations-table-state";
import { RequestReconciliationControl } from "./request-reconciliation-control";

type StatusFilter = "ALL" | (typeof RECONCILIATION_RUN_STATUS_VALUES)[number];

export function ReconciliationRunsPanel({
  canReconcile,
}: {
  canReconcile: boolean;
}) {
  const trpc = useTRPC();
  const [status, setStatus] = React.useState<StatusFilter>("ALL");
  const result = useInfiniteQuery({
    ...trpc.commerceReconciliation.listRuns.infiniteQueryOptions(
      { limit: 25, status: status === "ALL" ? undefined : status },
      { getNextPageParam: (page) => page.nextCursor ?? undefined },
    ),
    refetchInterval: 10_000,
  });
  const runs = result.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2 border-y border-black/5 p-4 dark:border-white/5">
        <Select
          value={status}
          onValueChange={(value) => {
            if (value === "ALL") return setStatus("ALL");
            const parsed = reconciliationRunStatusSchema.safeParse(value);
            if (parsed.success) setStatus(parsed.data);
          }}
        >
          <SelectTrigger size="sm" aria-label="Reconciliation run status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {RECONCILIATION_RUN_STATUS_VALUES.map((value) => (
              <SelectItem key={value} value={value}>{humanizeOperationLabel(value)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <RequestReconciliationControl canReconcile={canReconcile} />
      </div>

      <OperationsTableState
        isLoading={result.isLoading}
        error={result.error}
        isEmpty={!result.isLoading && runs.length === 0}
        emptyTitle="No reconciliation runs"
        onRetry={() => void result.refetch()}
      />
      {runs.length > 0 && (
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 text-xs text-primary/50">Requested</TableHead>
              <TableHead className="text-xs text-primary/50">Window</TableHead>
              <TableHead className="text-xs text-primary/50">Source</TableHead>
              <TableHead className="text-right text-xs text-primary/50">Receipts</TableHead>
              <TableHead className="text-right text-xs text-primary/50">Ledger</TableHead>
              <TableHead className="text-right text-xs text-primary/50">Issues</TableHead>
              <TableHead className="pr-4 text-xs text-primary/50">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => (
              <TableRow key={run.id}>
                <TableCell className="px-4 text-xs text-primary/55">{formatOperationDate(run.createdAt)}</TableCell>
                <TableCell>
                  <p className="text-xs">{formatOperationDate(run.windowStart)}</p>
                  <p className="text-[11px] text-primary/45">to {formatOperationDate(run.windowEnd)}</p>
                </TableCell>
                <TableCell>
                  <p className="text-xs">{humanizeOperationLabel(run.provider)}</p>
                  <p className="text-[11px] text-primary/45">{run.locationName ?? "All locations"}</p>
                </TableCell>
                <TableCell className="text-right text-xs">{run.providerRecords}</TableCell>
                <TableCell className="text-right text-xs">{run.localRecords}</TableCell>
                <TableCell className="text-right text-xs font-medium">{run.issuesFound}</TableCell>
                <TableCell className="pr-4">
                  <OperationStatusBadge value={run.status} />
                  {run.errorMessage && <p className="mt-1 max-w-56 truncate text-[10px] text-rose-600" title={run.errorMessage}>{run.errorMessage}</p>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <OperationsPagination
        hasNextPage={Boolean(result.hasNextPage)}
        isFetchingNextPage={result.isFetchingNextPage}
        onLoadMore={() => void result.fetchNextPage()}
      />
    </section>
  );
}
