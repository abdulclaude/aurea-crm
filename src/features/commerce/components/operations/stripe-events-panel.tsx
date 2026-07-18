"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import * as React from "react";
import { useDebounce } from "use-debounce";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  STRIPE_EVENT_STATUS_VALUES,
  stripeEventStatusSchema,
} from "@/features/commerce/reconciliation-contracts";
import { useTRPC } from "@/trpc/client";

import { compactProviderId, formatOperationDate, humanizeOperationLabel } from "./formatters";
import { OperationsPagination } from "./operations-pagination";
import { OperationStatusBadge } from "./operation-status-badge";
import { OperationsTableState } from "./operations-table-state";

type StatusFilter = "ALL" | (typeof STRIPE_EVENT_STATUS_VALUES)[number];

export function StripeEventsPanel() {
  const trpc = useTRPC();
  const [status, setStatus] = React.useState<StatusFilter>("ALL");
  const [eventType, setEventType] = React.useState("");
  const [eventTypeQuery] = useDebounce(eventType.trim(), 250);
  const result = useInfiniteQuery({
    ...trpc.commerceReconciliation.listStripeEvents.infiniteQueryOptions(
      {
        limit: 25,
        status: status === "ALL" ? undefined : status,
        eventType: eventTypeQuery || undefined,
      },
      { getNextPageParam: (page) => page.nextCursor ?? undefined },
    ),
  });
  const events = result.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2 border-y border-black/5 p-4 dark:border-white/5">
        <div className="relative min-w-56 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-primary/40" />
          <Input
            aria-label="Filter Stripe event type"
            className="h-8 pl-9 text-xs"
            placeholder="Event type"
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            if (value === "ALL") return setStatus("ALL");
            const parsed = stripeEventStatusSchema.safeParse(value);
            if (parsed.success) setStatus(parsed.data);
          }}
        >
          <SelectTrigger size="sm" aria-label="Stripe receipt status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STRIPE_EVENT_STATUS_VALUES.map((value) => (
              <SelectItem key={value} value={value}>{humanizeOperationLabel(value)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <OperationsTableState
        isLoading={result.isLoading}
        error={result.error}
        isEmpty={!result.isLoading && events.length === 0}
        emptyTitle="No Stripe receipts"
        onRetry={() => void result.refetch()}
      />
      {events.length > 0 && (
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 text-xs text-primary/50">Received</TableHead>
              <TableHead className="text-xs text-primary/50">Event</TableHead>
              <TableHead className="text-xs text-primary/50">Object</TableHead>
              <TableHead className="text-xs text-primary/50">Source</TableHead>
              <TableHead className="text-xs text-primary/50">Attempts</TableHead>
              <TableHead className="text-xs text-primary/50">Status</TableHead>
              <TableHead className="pr-4 text-xs text-primary/50">Last error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="px-4 text-xs text-primary/55">{formatOperationDate(event.receivedAt)}</TableCell>
                <TableCell>
                  <p className="max-w-64 truncate font-mono text-[11px]" title={event.type}>{event.type}</p>
                  <p className="font-mono text-[10px] text-primary/40" title={event.stripeEventId}>{compactProviderId(event.stripeEventId)}</p>
                </TableCell>
                <TableCell>
                  <p className="font-mono text-[11px]" title={event.objectId ?? undefined}>{compactProviderId(event.objectId)}</p>
                  <p className="text-[11px] text-primary/45">{event.objectType ?? "-"}</p>
                </TableCell>
                <TableCell>
                  <p className="text-xs">{event.source}</p>
                  <p className="text-[11px] text-primary/45">{event.livemode ? "Live" : "Test"}</p>
                  <p className="max-w-36 truncate text-[10px] text-primary/40">{event.locationName ?? "All locations"}</p>
                </TableCell>
                <TableCell className="text-xs text-primary/60">{event.attempts} / {event.maxAttempts}</TableCell>
                <TableCell><OperationStatusBadge value={event.status} /></TableCell>
                <TableCell className="pr-4">
                  <p className="max-w-64 truncate text-xs text-rose-600" title={event.errorMessage ?? undefined}>{event.errorMessage ?? "-"}</p>
                  <p className="text-[10px] text-primary/40">{event.errorCode ?? ""}</p>
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
