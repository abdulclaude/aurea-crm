"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Eye, Search, SendHorizontal } from "lucide-react";
import * as React from "react";
import { useDebounce } from "use-debounce";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  DELIVERY_CHANNELS,
  OUTBOUND_DELIVERY_STATUSES,
  type DeliveryChannel,
  type OutboundDeliveryStatus,
} from "@/features/delivery/contracts";
import { useTRPC } from "@/trpc/client";

import { DeliveryDetailDialog } from "./delivery-detail-dialog";
import { DeliveryStatusBadge } from "./delivery-status-badge";
import { DeliverySummaryStrip } from "./delivery-summary-strip";

function label(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function isStatusFilter(
  value: string,
): value is "ALL" | OutboundDeliveryStatus {
  return (
    value === "ALL" ||
    OUTBOUND_DELIVERY_STATUSES.some((status) => status === value)
  );
}

function isChannelFilter(value: string): value is "ALL" | DeliveryChannel {
  return (
    value === "ALL" || DELIVERY_CHANNELS.some((channel) => channel === value)
  );
}

export function DeliveryOperationsPage(): React.JSX.Element {
  const trpc = useTRPC();
  const [status, setStatus] = React.useState<"ALL" | OutboundDeliveryStatus>(
    "ALL",
  );
  const [channel, setChannel] = React.useState<"ALL" | DeliveryChannel>("ALL");
  const [search, setSearch] = React.useState("");
  const [query] = useDebounce(search.trim(), 250);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const summary = useQuery({
    ...trpc.deliveryOperations.summary.queryOptions(),
    refetchInterval: 10_000,
  });
  const deliveries = useInfiniteQuery({
    ...trpc.deliveryOperations.list.infiniteQueryOptions(
      {
        limit: 25,
        status: status === "ALL" ? undefined : status,
        channel: channel === "ALL" ? undefined : channel,
        query: query || undefined,
      },
      { getNextPageParam: (page) => page.nextCursor ?? undefined },
    ),
    refetchInterval: 10_000,
  });
  const rows = deliveries.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="min-w-0">
      <header className="p-8">
        <h1 className="text-xl font-semibold">Delivery operations</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Provider acceptance, delivery receipts, suppressions, and failures.
        </p>
      </header>
      <Separator />
      {summary.data ? (
        <DeliverySummaryStrip summary={summary.data} />
      ) : (
        <Skeleton className="h-[78px] rounded-none" />
      )}
      <div className="flex flex-wrap items-center gap-2 border-b border-black/5 p-4 sm:px-8 dark:border-white/5">
        <div className="relative min-w-56 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-primary/40" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search delivery operations"
            placeholder="Customer, destination, or provider ID"
            className="h-8 pl-9 text-xs"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            if (isStatusFilter(value)) setStatus(value);
          }}
        >
          <SelectTrigger size="sm" aria-label="Delivery status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {OUTBOUND_DELIVERY_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {label(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={channel}
          onValueChange={(value) => {
            if (isChannelFilter(value)) setChannel(value);
          }}
        >
          <SelectTrigger size="sm" aria-label="Delivery channel">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All channels</SelectItem>
            {DELIVERY_CHANNELS.map((value) => (
              <SelectItem key={value} value={value}>
                {label(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {deliveries.isLoading ? (
        <div className="space-y-2 p-6 sm:px-8">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-11 w-full" />
          ))}
        </div>
      ) : deliveries.error ? (
        <Empty className="min-h-72 rounded-none border-0">
          <EmptyHeader>
            <EmptyTitle>Delivery operations unavailable</EmptyTitle>
            <EmptyDescription>{deliveries.error.message}</EmptyDescription>
          </EmptyHeader>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void deliveries.refetch()}
          >
            Retry
          </Button>
        </Empty>
      ) : rows.length === 0 ? (
        <Empty className="min-h-72 rounded-none border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SendHorizontal />
            </EmptyMedia>
            <EmptyTitle>No delivery operations</EmptyTitle>
            <EmptyDescription>
              No messages match the current filters.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[1050px]">
            <TableHeader>
              <TableRow>
                <TableHead className="px-8 text-xs text-primary/50">
                  Created
                </TableHead>
                <TableHead className="text-xs text-primary/50">
                  Customer
                </TableHead>
                <TableHead className="text-xs text-primary/50">
                  Channel
                </TableHead>
                <TableHead className="text-xs text-primary/50">
                  Source
                </TableHead>
                <TableHead className="text-xs text-primary/50">
                  Status
                </TableHead>
                <TableHead className="text-xs text-primary/50">
                  Attempts
                </TableHead>
                <TableHead className="text-xs text-primary/50">
                  Last error
                </TableHead>
                <TableHead className="w-12 pr-8">
                  <span className="sr-only">Details</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="px-8 text-xs text-primary/60">
                    {formatDate(row.createdAt)}
                  </TableCell>
                  <TableCell>
                    <p className="max-w-48 truncate text-xs font-medium">
                      {row.clientName ?? row.destination}
                    </p>
                    <p className="max-w-48 truncate text-[11px] text-primary/45">
                      {row.clientEmail ?? row.destination}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-medium">{label(row.channel)}</p>
                    <p className="text-[11px] text-primary/45">
                      {label(row.provider)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs">{label(row.sourceType)}</p>
                    <p className="max-w-44 truncate font-mono text-[11px] text-primary/45">
                      {row.sourceId}
                    </p>
                  </TableCell>
                  <TableCell>
                    <DeliveryStatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {row.attemptCount} / {row.maxAttempts}
                  </TableCell>
                  <TableCell>
                    <p
                      className="max-w-64 truncate text-xs text-primary/70"
                      title={row.lastErrorMessage ?? undefined}
                    >
                      {row.lastErrorCode ?? row.lastErrorMessage ?? "-"}
                    </p>
                  </TableCell>
                  <TableCell className="pr-8 text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="View delivery detail"
                          onClick={() => setSelectedId(row.id)}
                        >
                          <Eye />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View detail</TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {deliveries.hasNextPage ? (
            <div className="flex justify-center border-t border-black/5 p-4 dark:border-white/5">
              <Button
                variant="outline"
                size="sm"
                disabled={deliveries.isFetchingNextPage}
                onClick={() => void deliveries.fetchNextPage()}
              >
                {deliveries.isFetchingNextPage ? "Loading..." : "Load more"}
              </Button>
            </div>
          ) : null}
        </div>
      )}
      <DeliveryDetailDialog
        deliveryId={selectedId}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      />
    </div>
  );
}
