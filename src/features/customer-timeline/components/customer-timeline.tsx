"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  CalendarDays,
  CircleDollarSign,
  Coins,
  LoaderCircle,
  Mail,
  RefreshCw,
  Sparkles,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import type { JSX } from "react";

import { Button } from "@/components/ui/button";
import { TableBadge } from "@/components/ui/table-badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { CustomerTimelineEvent } from "@/features/customer-timeline/contracts";
import { formatMinorUnits } from "@/features/commerce/lib/money";
import { memberStatusBadgeColor } from "@/features/crm/components/member-status-badge";
import { useTRPC } from "@/trpc/client";

const KIND_ICONS = {
  BOOKING: CalendarDays,
  ATTENDANCE: UserCheck,
  PAYMENT: CircleDollarSign,
  CREDIT: Coins,
  MESSAGE: Mail,
  WORKFLOW: Sparkles,
} satisfies Record<CustomerTimelineEvent["kind"], LucideIcon>;

function TimelineRow({ event }: { event: CustomerTimelineEvent }): JSX.Element {
  const Icon = KIND_ICONS[event.kind];
  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-b border-black/5 px-6 py-4 last:border-b-0 dark:border-white/5">
      <div className="flex size-8 items-center justify-center rounded-md border border-black/5 bg-muted/40 dark:border-white/5">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{event.title}</p>
            {event.description ? (
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                {event.description}
              </p>
            ) : null}
          </div>
          {event.status ? (
            <TableBadge
              color={memberStatusBadgeColor(event.status)}
              className="font-normal capitalize"
            >
              {event.status.toLowerCase().replaceAll("_", " ")}
            </TableBadge>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span title={format(event.occurredAt, "PPpp")}>
            {formatDistanceToNow(event.occurredAt, { addSuffix: true })}
          </span>
          {event.secondaryAt ? (
            <span>Scheduled {format(event.secondaryAt, "d MMM, HH:mm")}</span>
          ) : null}
          {event.money ? (
            <span className="font-medium text-foreground">
              {formatMinorUnits(
                event.money.amountMinor,
                event.money.currency,
                event.money.exponent,
              )}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function CustomerTimeline({
  clientId,
}: {
  clientId: string;
}): JSX.Element {
  const trpc = useTRPC();
  const timeline = useInfiniteQuery({
    ...trpc.customerTimeline.list.infiniteQueryOptions(
      { clientId, limit: 25 },
      { getNextPageParam: (page) => page.nextCursor ?? undefined },
    ),
  });
  const events = timeline.data?.pages.flatMap((page) => page.items) ?? [];

  if (timeline.isLoading) {
    return (
      <div className="flex h-48 items-center justify-center gap-2 text-xs text-muted-foreground">
        <LoaderCircle className="size-3.5 animate-spin" />
        Loading customer timeline...
      </div>
    );
  }
  if (timeline.error) {
    return (
      <Empty className="min-h-64 rounded-none border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RefreshCw />
          </EmptyMedia>
          <EmptyTitle>Timeline unavailable</EmptyTitle>
          <EmptyDescription>{timeline.error.message}</EmptyDescription>
        </EmptyHeader>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void timeline.refetch()}
        >
          Retry
        </Button>
      </Empty>
    );
  }
  if (events.length === 0) {
    return (
      <Empty className="min-h-64 rounded-none border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarDays />
          </EmptyMedia>
          <EmptyTitle>No customer activity yet</EmptyTitle>
          <EmptyDescription>
            Bookings, attendance, payments, credits, messages, and workflow
            outcomes will appear here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="border-y border-black/5 dark:border-white/5">
      {events.map((event) => (
        <TimelineRow key={event.id} event={event} />
      ))}
      {timeline.hasNextPage ? (
        <div className="flex justify-center p-4">
          <Button
            variant="outline"
            size="sm"
            disabled={timeline.isFetchingNextPage}
            onClick={() => void timeline.fetchNextPage()}
          >
            {timeline.isFetchingNextPage ? (
              <LoaderCircle className="animate-spin" />
            ) : null}
            Load older activity
          </Button>
        </div>
      ) : null}
    </div>
  );
}
