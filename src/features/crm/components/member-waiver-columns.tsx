import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import type { LifecycleSummary } from "./member-lifecycle-types";
import { MemberStatusBadge } from "./member-status-badge";

export type WaiverRow = {
  id: string;
  name: string;
  version: number;
  status: string;
};

export type SignatureRow =
  LifecycleSummary["waivers"]["signatures"][number] & {
    status: string;
  };

export const waiverColumns: ColumnDef<WaiverRow>[] = [
  {
    accessorKey: "name",
    header: "Waiver",
    meta: { label: "Waiver" },
    enableHiding: false,
  },
  {
    accessorKey: "version",
    header: "Version",
    meta: { label: "Version" },
    cell: ({ row }) => `Version ${row.original.version}`,
  },
  {
    accessorKey: "status",
    header: "Client status",
    meta: { label: "Client status" },
    cell: ({ row }) => <MemberStatusBadge status={row.original.status} />,
  },
];

export const signatureColumns: ColumnDef<SignatureRow>[] = [
  {
    id: "name",
    accessorFn: (row) => row.template.name,
    header: "Waiver",
    meta: { label: "Waiver" },
    enableHiding: false,
  },
  {
    id: "version",
    accessorFn: (row) => row.template.version,
    header: "Version",
    meta: { label: "Version" },
    cell: ({ row }) => `Version ${row.original.template.version}`,
  },
  {
    accessorKey: "signedAt",
    header: "Signed date",
    meta: { label: "Signed date" },
    cell: ({ row }) => format(new Date(row.original.signedAt), "d MMM yyyy"),
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
    accessorKey: "status",
    header: "Signature status",
    meta: { label: "Signature status" },
    cell: ({ row }) => <MemberStatusBadge status={row.original.status} />,
  },
];
