"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Search } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatMinorUnits } from "@/features/commerce/lib/money";
import {
  LEDGER_KIND_VALUES,
  LEDGER_STATUS_VALUES,
  ledgerKindSchema,
  ledgerStatusSchema,
} from "@/features/commerce/reconciliation-contracts";
import type { LedgerEntryListItem } from "@/features/commerce/reconciliation-output-contracts";
import { useTRPC } from "@/trpc/client";

import { compactProviderId, formatOperationDate, humanizeOperationLabel } from "./formatters";
import { OperationsPagination } from "./operations-pagination";
import { OperationStatusBadge } from "./operation-status-badge";
import { OperationsTableState } from "./operations-table-state";
import { RefundPaymentDialog } from "./refund-payment-dialog";

type KindFilter = "ALL" | (typeof LEDGER_KIND_VALUES)[number];
type StatusFilter = "ALL" | (typeof LEDGER_STATUS_VALUES)[number];

function displayAmount(value: number, currency: string, exponent: number): string {
  try {
    return formatMinorUnits(value, currency, exponent);
  } catch {
    return `${currency} ${value}`;
  }
}

type RefundSelection = {
  entry: LedgerEntryListItem;
  requestId: string;
};

export function LedgerEntriesPanel({ canRefund }: { canRefund: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [kind, setKind] = React.useState<KindFilter>("ALL");
  const [status, setStatus] = React.useState<StatusFilter>("ALL");
  const [search, setSearch] = React.useState("");
  const [refundSelection, setRefundSelection] =
    React.useState<RefundSelection | null>(null);
  const [query] = useDebounce(search.trim(), 250);
  const result = useInfiniteQuery({
    ...trpc.commerceReconciliation.listLedgerEntries.infiniteQueryOptions(
      {
        limit: 25,
        kind: kind === "ALL" ? undefined : kind,
        status: status === "ALL" ? undefined : status,
        query: query || undefined,
      },
      { getNextPageParam: (page) => page.nextCursor ?? undefined },
    ),
  });
  const entries = result.data?.pages.flatMap((page) => page.items) ?? [];
  const refundMutation = useMutation(
    trpc.commerceRefunds.create.mutationOptions({
      onSuccess: () => {
        toast.success("Refund submitted to Stripe");
        setRefundSelection(null);
        void queryClient.invalidateQueries({
          queryKey: trpc.commerceReconciliation.listLedgerEntries.queryKey(),
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2 border-y border-black/5 p-4 dark:border-white/5">
        <div className="relative min-w-56 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-primary/40" />
          <Input
            aria-label="Search ledger entries"
            className="h-8 pl-9 text-xs"
            placeholder="Provider ID, customer, or invoice"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select
          value={kind}
          onValueChange={(value) => {
            if (value === "ALL") return setKind("ALL");
            const parsed = ledgerKindSchema.safeParse(value);
            if (parsed.success) setKind(parsed.data);
          }}
        >
          <SelectTrigger size="sm" aria-label="Ledger entry type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All entry types</SelectItem>
            {LEDGER_KIND_VALUES.map((value) => (
              <SelectItem key={value} value={value}>{humanizeOperationLabel(value)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(value) => {
            if (value === "ALL") return setStatus("ALL");
            const parsed = ledgerStatusSchema.safeParse(value);
            if (parsed.success) setStatus(parsed.data);
          }}
        >
          <SelectTrigger size="sm" aria-label="Ledger status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {LEDGER_STATUS_VALUES.map((value) => (
              <SelectItem key={value} value={value}>{humanizeOperationLabel(value)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <OperationsTableState
        isLoading={result.isLoading}
        error={result.error}
        isEmpty={!result.isLoading && entries.length === 0}
        emptyTitle="No ledger entries"
        onRetry={() => void result.refetch()}
      />
      {entries.length > 0 && (
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 text-xs text-primary/50">Occurred</TableHead>
              <TableHead className="text-xs text-primary/50">Entry</TableHead>
              <TableHead className="text-xs text-primary/50">Customer</TableHead>
              <TableHead className="text-xs text-primary/50">Provider object</TableHead>
              <TableHead className="text-xs text-primary/50">Status</TableHead>
              <TableHead className="text-right text-xs text-primary/50">Gross</TableHead>
              <TableHead className="pr-4 text-right text-xs text-primary/50">Net</TableHead>
              {canRefund && <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="px-4 text-xs text-primary/55">{formatOperationDate(entry.occurredAt)}</TableCell>
                <TableCell>
                  <p className="text-xs font-medium">{humanizeOperationLabel(entry.kind)}</p>
                  <p className="text-[11px] text-primary/45">{entry.provider} / {entry.locationName ?? "All locations"}</p>
                </TableCell>
                <TableCell>
                  <p className="max-w-44 truncate text-xs font-medium">{entry.clientName ?? entry.invoiceNumber ?? "-"}</p>
                  <p className="max-w-44 truncate text-[11px] text-primary/45">{entry.clientEmail ?? entry.invoiceNumber ?? ""}</p>
                </TableCell>
                <TableCell>
                  <p className="font-mono text-[11px]" title={entry.providerObjectId}>{compactProviderId(entry.providerObjectId)}</p>
                  <p className="text-[11px] text-primary/45">{entry.providerObjectType}</p>
                </TableCell>
                <TableCell><OperationStatusBadge value={entry.status} /></TableCell>
                <TableCell className="text-right text-xs font-medium">{displayAmount(entry.amountMinor, entry.currency, entry.currencyExponent)}</TableCell>
                <TableCell className="pr-4 text-right text-xs text-primary/60">{entry.netMinor === null ? "-" : displayAmount(entry.netMinor, entry.currency, entry.currencyExponent)}</TableCell>
                {canRefund && (
                  <TableCell className="pr-4 text-right">
                    {entry.provider === "STRIPE" &&
                      entry.kind === "PAYMENT" &&
                      ["SUCCEEDED", "PARTIALLY_REFUNDED"].includes(entry.status) &&
                      entry.paymentIntentId &&
                      entry.refundableMinor > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Refund payment"
                              onClick={() =>
                                setRefundSelection({
                                  entry,
                                  requestId: crypto.randomUUID(),
                                })
                              }
                            >
                              <RotateCcw />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Refund payment</TooltipContent>
                        </Tooltip>
                      )}
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
      <RefundPaymentDialog
        entry={refundSelection?.entry ?? null}
        isPending={refundMutation.isPending}
        onOpenChange={(open) => {
          if (!open && !refundMutation.isPending) setRefundSelection(null);
        }}
        onSubmit={({ amountMinor, reason }) => {
          if (!refundSelection) return;
          refundMutation.mutate({
            ledgerEntryId: refundSelection.entry.id,
            requestId: refundSelection.requestId,
            amountMinor,
            reason,
          });
        }}
      />
    </section>
  );
}
