"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Link from "next/link";

import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { PricingOptionDetail } from "./types";

type Subscriber = PricingOptionDetail["subscribers"][number];

const columns: ColumnDef<Subscriber>[] = [
  {
    accessorKey: "clientName",
    header: "Member",
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium">{row.original.clientName}</p>
        <p className="text-xs text-muted-foreground">
          {row.original.clientEmail ?? "No email"}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant="secondary">{formatLabel(row.original.status)}</Badge>
    ),
  },
  {
    accessorKey: "startDate",
    header: "Started",
    cell: ({ row }) => (
      <span className="text-xs">
        {format(row.original.startDate, "d MMM yyyy")}
      </span>
    ),
  },
  {
    id: "nextDate",
    header: "Next date",
    cell: ({ row }) => (
      <span className="text-xs">
        {row.original.renewalDate
          ? `Renews ${format(row.original.renewalDate, "d MMM yyyy")}`
          : row.original.endDate
            ? `Ends ${format(row.original.endDate, "d MMM yyyy")}`
            : "Ongoing"}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Button asChild variant="ghost" size="sm">
        <Link href={`/members/${row.original.clientId}`}>View member</Link>
      </Button>
    ),
  },
];

export function PricingOptionSubscribers({
  option,
}: {
  option: PricingOptionDetail;
}) {
  return (
    <DataTable
      columns={columns}
      data={option.subscribers}
      getRowId={(row) => row.id}
      enableGlobalSearch
      toolbar={{ search: { placeholder: "Search subscribers..." } }}
      emptyState={
        <p className="py-12 text-center text-sm text-muted-foreground">
          No members have this pricing option.
        </p>
      }
    />
  );
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
