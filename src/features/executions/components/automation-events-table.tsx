"use client";

import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AutomationEventRow = {
  id: string;
  type: string;
  name: string;
  occurredAt: Date;
  workflowName: string;
  clientName: string | null;
};

export function AutomationEventsTable({
  events,
}: {
  events: AutomationEventRow[];
}) {
  return (
    <Card className="rounded-sm border-black/10 bg-background">
      <CardHeader>
        <CardTitle className="text-sm">Recent automation events</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Workflow</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length > 0 ? (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {formatEventType(event.type)}
                      </Badge>
                      <span className="font-medium">{event.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{event.workflowName}</TableCell>
                  <TableCell>{event.clientName ?? "-"}</TableCell>
                  <TableCell className="text-primary/60">
                    {formatDistanceToNow(event.occurredAt, { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-xs text-primary/60"
                >
                  No persisted automation events in the selected window.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function formatEventType(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
