"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format, isPast } from "date-fns";
import Link from "next/link";
import * as React from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TABLE_BADGE_COLORS, TableBadge } from "@/components/ui/table-badge";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { WaiverDataTable } from "./waiver-data-table";

type Signature =
  inferRouterOutputs<AppRouter>["waivers"]["listSignatures"][number];
type SignatureRow = Signature & { status: "CURRENT" | "EXPIRED" };

const SIGNATURE_COLUMN_ORDER = [
  "client",
  "templateName",
  "templateVersion",
  "signedAt",
  "expiresAt",
  "guardianName",
  "status",
];

const signatureColumns: ColumnDef<SignatureRow>[] = [
  {
    id: "client",
    accessorFn: (row) => `${row.clientName} ${row.clientEmail ?? ""}`,
    header: "Client",
    meta: { label: "Client" },
    enableHiding: false,
    cell: ({ row }) => (
      <Link
        href={`/clients/${row.original.clientId}`}
        className="group flex min-w-0 items-center gap-2"
      >
        <Avatar className="size-7">
          <AvatarFallback className="border border-slate-200 bg-slate-100 text-[9px] font-medium text-slate-800">
            {row.original.clientName.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-primary group-hover:underline">
            {row.original.clientName}
          </p>
          <p className="truncate text-[10px] text-primary/45">
            {row.original.clientEmail ?? "No email"}
          </p>
        </div>
      </Link>
    ),
  },
  {
    accessorKey: "templateName",
    header: "Waiver",
    meta: { label: "Waiver" },
  },
  {
    accessorKey: "templateVersion",
    header: "Version",
    meta: { label: "Version" },
    cell: ({ row }) =>
      row.original.templateVersion === null
        ? "Legacy / unknown"
        : `v${row.original.templateVersion}`,
  },
  {
    accessorKey: "signedAt",
    header: "Signed date",
    meta: { label: "Signed date" },
    cell: ({ row }) =>
      format(new Date(row.original.signedAt), "d MMM yyyy, HH:mm"),
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
    accessorKey: "guardianName",
    header: "Guardian",
    meta: { label: "Guardian" },
    cell: ({ row }) => row.original.guardianName ?? "Not required",
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <TableBadge
        color={
          row.original.status === "CURRENT"
            ? TABLE_BADGE_COLORS.teal
            : TABLE_BADGE_COLORS.rose
        }
      >
        {row.original.status === "CURRENT" ? "Current" : "Expired"}
      </TableBadge>
    ),
  },
];

export function WaiverSignaturesTable() {
  const trpc = useTRPC();
  const signaturesQuery = useQuery(trpc.waivers.listSignatures.queryOptions());
  const [statuses, setStatuses] = React.useState<string[]>([]);
  const rows: SignatureRow[] = (signaturesQuery.data ?? []).map(
    (signature) => ({
      ...signature,
      status:
        signature.expiresAt && isPast(new Date(signature.expiresAt))
          ? "EXPIRED"
          : "CURRENT",
    }),
  );
  const signatures = statuses.length
    ? rows.filter((signature) => statuses.includes(signature.status))
    : rows;

  return (
    <WaiverDataTable
      columns={signatureColumns}
      data={signatures}
      getRowId={(signature) => signature.id}
      initialColumnOrder={SIGNATURE_COLUMN_ORDER}
      primaryColumnId="client"
      searchPlaceholder="Search signatures by client or waiver..."
      emptyLabel={
        signaturesQuery.error?.message ?? "No waiver signatures found."
      }
      isLoading={signaturesQuery.isLoading}
      filterGroups={[
        {
          label: "Signature status",
          options: [
            { value: "CURRENT", label: "Current" },
            { value: "EXPIRED", label: "Expired" },
          ],
          selectedValues: statuses,
          onChange: setStatuses,
        },
      ]}
    />
  );
}
