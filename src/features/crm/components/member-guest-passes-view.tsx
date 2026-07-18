"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import * as React from "react";

import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { MemberDataTable } from "./member-data-table";
import { MemberStatusBadge } from "./member-status-badge";

type GuestPassRow =
  inferRouterOutputs<AppRouter>["commerceSettings"]["listGuestPasses"][number];

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
    cell: ({ row }) => format(new Date(row.original.issuedAt), "d MMM yyyy"),
  },
  {
    accessorKey: "expiresAt",
    header: "Expiry date",
    meta: { label: "Expiry date" },
    cell: ({ row }) =>
      row.original.expiresAt
        ? format(new Date(row.original.expiresAt), "d MMM yyyy")
        : "No expiry",
  },
  {
    accessorKey: "redeemedAt",
    header: "Redeemed date",
    meta: { label: "Redeemed date" },
    cell: ({ row }) =>
      row.original.redeemedAt
        ? format(new Date(row.original.redeemedAt), "d MMM yyyy")
        : "Not redeemed",
  },
];

export function MemberGuestPassesView({ clientId }: { clientId: string }) {
  const trpc = useTRPC();
  const [statuses, setStatuses] = React.useState<string[]>([]);
  const passesQuery = useQuery(
    trpc.commerceSettings.listGuestPasses.queryOptions({
      ownerClientId: clientId,
    }),
  );
  const rows = React.useMemo(
    () =>
      statuses.length === 0
        ? (passesQuery.data ?? [])
        : (passesQuery.data ?? []).filter((pass) =>
            statuses.includes(pass.status),
          ),
    [passesQuery.data, statuses],
  );

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
              { value: "PENDING_APPROVAL", label: "Pending approval" },
              { value: "ACTIVE", label: "Active" },
              { value: "REDEEMED", label: "Redeemed" },
              { value: "EXPIRED", label: "Expired" },
              { value: "REVOKED", label: "Revoked" },
            ],
            selectedValues: statuses,
            onChange: setStatuses,
          },
        ]}
        isLoading={passesQuery.isLoading}
      />
    </div>
  );
}
