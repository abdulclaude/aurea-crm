"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import * as React from "react";

import { MemberDataTable } from "./member-data-table";
import { MemberStatusBadge } from "./member-status-badge";

type GuestPassRow = {
  id: string;
  guestName: string;
  status: string;
  issuedAt: Date;
  expiresAt: Date | null;
  redeemedAt: Date | null;
};

const GUEST_PASS_COLUMN_ORDER = [
  "guestName",
  "status",
  "issuedAt",
  "expiresAt",
  "redeemedAt",
];

const guestPassColumns: ColumnDef<GuestPassRow>[] = [
  {
    accessorKey: "guestName",
    header: "Guest",
    meta: { label: "Guest" },
    enableHiding: false,
  },
  {
    accessorKey: "status",
    header: "Pass status",
    meta: { label: "Pass status" },
    cell: ({ row }) => <MemberStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "issuedAt",
    header: "Issued date",
    meta: { label: "Issued date" },
    cell: ({ row }) => format(row.original.issuedAt, "d MMM yyyy"),
  },
  {
    accessorKey: "expiresAt",
    header: "Expiry date",
    meta: { label: "Expiry date" },
    cell: ({ row }) =>
      row.original.expiresAt
        ? format(row.original.expiresAt, "d MMM yyyy")
        : "No expiry",
  },
  {
    accessorKey: "redeemedAt",
    header: "Redeemed date",
    meta: { label: "Redeemed date" },
    cell: ({ row }) =>
      row.original.redeemedAt
        ? format(row.original.redeemedAt, "d MMM yyyy")
        : "Not redeemed",
  },
];

export function MemberGuestPassesView() {
  const [statuses, setStatuses] = React.useState<string[]>([]);
  const rows: GuestPassRow[] = [];

  return (
    <div className="py-5">
      <MemberDataTable
        columns={guestPassColumns}
        data={rows}
        getRowId={(pass) => pass.id}
        initialColumnOrder={GUEST_PASS_COLUMN_ORDER}
        primaryColumnId="guestName"
        searchPlaceholder="Search guest passes..."
        emptyLabel="No guest passes have been issued to this client."
        filterGroups={[
          {
            label: "Pass status",
            options: [
              { value: "ISSUED", label: "Issued" },
              { value: "REDEEMED", label: "Redeemed" },
              { value: "EXPIRED", label: "Expired" },
            ],
            selectedValues: statuses,
            onChange: setStatuses,
          },
        ]}
      />
    </div>
  );
}
