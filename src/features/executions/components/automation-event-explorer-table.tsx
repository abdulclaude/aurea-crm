"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAutomationLabel } from "@/features/executions/components/automation-event-labels";
import type { AppRouter } from "@/trpc/routers/_app";

type ExplorerOutput = inferRouterOutputs<AppRouter>["executions"]["getAutomationEvents"];
type EventRow = ExplorerOutput["items"][number];

export function AutomationEventExplorerTable({ items }: { items: EventRow[] }) {
  return (
    <div className="overflow-x-auto border-b border-black/10">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead>Workflow</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Source trigger</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Occurred</TableHead>
            <TableHead className="w-12"><span className="sr-only">Open</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length ? (
            items.map((event) => <EventTableRow key={event.id} event={event} />)
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-28 text-center text-sm text-muted-foreground">
                No automation events match these filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function EventTableRow({ event }: { event: EventRow }) {
  return (
    <TableRow>
      <TableCell>
        <div className="min-w-52 space-y-1">
          <Badge variant="secondary" className="text-xs">
            {formatAutomationLabel(event.type)}
          </Badge>
          <p className="text-sm font-medium">{event.name}</p>
        </div>
      </TableCell>
      <TableCell>{event.workflowName ?? "Deleted workflow"}</TableCell>
      <TableCell>{event.clientName ?? "-"}</TableCell>
      <TableCell>
        {event.sourceNodeType ? formatAutomationLabel(event.sourceNodeType) : "-"}
      </TableCell>
      <TableCell>
        {event.entityType ? (
          <div className="max-w-48">
            <p className="capitalize">{event.entityType.replaceAll("_", " ")}</p>
            {event.entityId ? (
              <p className="truncate font-mono text-xs text-muted-foreground" title={event.entityId}>
                {event.entityId}
              </p>
            ) : null}
          </div>
        ) : "-"}
      </TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground">
        <time dateTime={event.occurredAt.toISOString()}>
          {format(event.occurredAt, "dd MMM yyyy, HH:mm")}
        </time>
      </TableCell>
      <TableCell>
        {event.executionId ? (
          <Button asChild variant="ghost" size="icon" className="size-9">
            <Link
              href={`/executions/${event.executionId}`}
              aria-label={`Open execution for ${event.name}`}
              title="Open execution"
            >
              <ExternalLink className="size-4" />
            </Link>
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
