"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, CircleCheck } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  RECONCILIATION_ISSUE_TYPE_VALUES,
  RECONCILIATION_SEVERITY_VALUES,
  RECONCILIATION_STATUS_VALUES,
  reconciliationIssueTypeSchema,
  reconciliationSeveritySchema,
  reconciliationStatusSchema,
} from "@/features/commerce/reconciliation-contracts";
import { useTRPC } from "@/trpc/client";

import {
  compactProviderId,
  formatIssueDetails,
  formatOperationDate,
  humanizeOperationLabel,
} from "./formatters";
import { IssueResolutionDialog } from "./issue-resolution-dialog";
import { OperationStatusBadge } from "./operation-status-badge";
import { OperationsPagination } from "./operations-pagination";
import { OperationsTableState } from "./operations-table-state";

type StatusFilter = "ALL" | (typeof RECONCILIATION_STATUS_VALUES)[number];
type TypeFilter = "ALL" | (typeof RECONCILIATION_ISSUE_TYPE_VALUES)[number];
type SeverityFilter = "ALL" | (typeof RECONCILIATION_SEVERITY_VALUES)[number];

export function ReconciliationIssuesPanel({ canReconcile }: { canReconcile: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [status, setStatus] = React.useState<StatusFilter>("OPEN");
  const [type, setType] = React.useState<TypeFilter>("ALL");
  const [severity, setSeverity] = React.useState<SeverityFilter>("ALL");
  const [resolvingId, setResolvingId] = React.useState<string | null>(null);
  const result = useInfiniteQuery({
    ...trpc.commerceReconciliation.listIssues.infiniteQueryOptions(
      {
        limit: 25,
        status: status === "ALL" ? undefined : status,
        type: type === "ALL" ? undefined : type,
        severity: severity === "ALL" ? undefined : severity,
      },
      { getNextPageParam: (page) => page.nextCursor ?? undefined },
    ),
    refetchInterval: 10_000,
  });
  const issues = result.data?.pages.flatMap((page) => page.items) ?? [];
  const invalidate = () => queryClient.invalidateQueries({
    queryKey: trpc.commerceReconciliation.listIssues.queryKey(),
  });
  const acknowledge = useMutation(
    trpc.commerceReconciliation.acknowledgeIssue.mutationOptions({
      onSuccess: () => { toast.success("Issue acknowledged"); invalidate(); },
      onError: (error) => toast.error(error.message),
    }),
  );
  const resolve = useMutation(
    trpc.commerceReconciliation.resolveIssue.mutationOptions({
      onSuccess: () => {
        toast.success("Issue resolved");
        setResolvingId(null);
        invalidate();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2 border-y border-black/5 p-4 dark:border-white/5">
        <Select
          value={status}
          onValueChange={(value) => {
            if (value === "ALL") return setStatus("ALL");
            const parsed = reconciliationStatusSchema.safeParse(value);
            if (parsed.success) setStatus(parsed.data);
          }}
        >
          <SelectTrigger size="sm" aria-label="Reconciliation issue status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {RECONCILIATION_STATUS_VALUES.map((value) => <SelectItem key={value} value={value}>{humanizeOperationLabel(value)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          value={type}
          onValueChange={(value) => {
            if (value === "ALL") return setType("ALL");
            const parsed = reconciliationIssueTypeSchema.safeParse(value);
            if (parsed.success) setType(parsed.data);
          }}
        >
          <SelectTrigger size="sm" aria-label="Reconciliation issue type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All issue types</SelectItem>
            {RECONCILIATION_ISSUE_TYPE_VALUES.map((value) => <SelectItem key={value} value={value}>{humanizeOperationLabel(value)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          value={severity}
          onValueChange={(value) => {
            if (value === "ALL") return setSeverity("ALL");
            const parsed = reconciliationSeveritySchema.safeParse(value);
            if (parsed.success) setSeverity(parsed.data);
          }}
        >
          <SelectTrigger size="sm" aria-label="Reconciliation issue severity"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All severities</SelectItem>
            {RECONCILIATION_SEVERITY_VALUES.map((value) => <SelectItem key={value} value={value}>{humanizeOperationLabel(value)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <OperationsTableState
        isLoading={result.isLoading}
        error={result.error}
        isEmpty={!result.isLoading && issues.length === 0}
        emptyTitle="No reconciliation issues"
        onRetry={() => void result.refetch()}
      />
      {issues.length > 0 && (
        <Table className="min-w-[1050px]">
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 text-xs text-primary/50">Detected</TableHead>
              <TableHead className="text-xs text-primary/50">Issue</TableHead>
              <TableHead className="text-xs text-primary/50">Provider object</TableHead>
              <TableHead className="text-xs text-primary/50">Recovery</TableHead>
              <TableHead className="text-xs text-primary/50">Severity</TableHead>
              <TableHead className="text-xs text-primary/50">Status</TableHead>
              {canReconcile && <TableHead className="pr-4 text-right text-xs text-primary/50">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.map((issue) => (
              <TableRow key={issue.id}>
                <TableCell className="px-4 text-xs text-primary/55">{formatOperationDate(issue.detectedAt)}</TableCell>
                <TableCell>
                  <p className="text-xs font-medium">{humanizeOperationLabel(issue.type)}</p>
                  <p className="font-mono text-[10px] text-primary/40">{compactProviderId(issue.ledgerEntryId ?? issue.stripeEventId)}</p>
                  <p className="max-w-44 truncate text-[10px] text-primary/40">{issue.locationName ?? "All locations"}</p>
                </TableCell>
                <TableCell className="font-mono text-[11px]" title={issue.providerObjectId ?? undefined}>{compactProviderId(issue.providerObjectId)}</TableCell>
                <TableCell>
                  <p className="max-w-72 whitespace-normal text-xs text-primary/60">{issue.recoveryAction ?? "-"}</p>
                  <p className="mt-1 max-w-72 truncate text-[10px] text-primary/40" title={formatIssueDetails(issue.expected)}>
                    Expected: {formatIssueDetails(issue.expected) || "-"}
                  </p>
                  <p className="max-w-72 truncate text-[10px] text-primary/40" title={formatIssueDetails(issue.actual)}>
                    Actual: {formatIssueDetails(issue.actual) || "-"}
                  </p>
                  {issue.resolutionNote && (
                    <p className="mt-1 max-w-72 whitespace-normal text-[11px] text-primary/45">{issue.resolutionNote}</p>
                  )}
                </TableCell>
                <TableCell><OperationStatusBadge value={issue.severity} /></TableCell>
                <TableCell><OperationStatusBadge value={issue.status} /></TableCell>
                {canReconcile && (
                  <TableCell className="pr-4">
                    <div className="flex justify-end gap-2">
                      {issue.status === "OPEN" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={acknowledge.isPending}
                          onClick={() => acknowledge.mutate({ id: issue.id })}
                        >
                          <Check />Acknowledge
                        </Button>
                      )}
                      {(issue.status === "OPEN" || issue.status === "ACKNOWLEDGED") && (
                        <Button size="sm" variant="outline" onClick={() => setResolvingId(issue.id)}>
                          <CircleCheck />Resolve
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
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
      <IssueResolutionDialog
        open={Boolean(resolvingId)}
        isPending={resolve.isPending}
        onOpenChange={(open) => { if (!open) setResolvingId(null); }}
        onResolve={(resolutionNote) => {
          if (resolvingId) resolve.mutate({ id: resolvingId, resolutionNote });
        }}
      />
    </section>
  );
}
