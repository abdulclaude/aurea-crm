"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { MemberDataTable } from "./member-data-table";
import { labelize } from "./member-lifecycle-types";

type HouseholdRow =
  inferRouterOutputs<AppRouter>["households"]["getForClient"][number];

const HOUSEHOLD_COLUMN_ORDER = [
  "name",
  "role",
  "relationship",
  "primaryContact",
  "members",
  "notes",
  "updatedAt",
];

const householdColumns: ColumnDef<HouseholdRow>[] = [
  {
    accessorKey: "name",
    header: "Household",
    meta: { label: "Household" },
    enableHiding: false,
  },
  {
    id: "role",
    accessorFn: (row) => row.currentMember?.role ?? "PRIMARY",
    header: "Client role",
    meta: { label: "Client role" },
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className="bg-violet-100 text-[11px] text-violet-600 ring-violet-300 dark:border-violet-800"
      >
        {labelize(row.original.currentMember?.role ?? "PRIMARY")}
      </Badge>
    ),
  },
  {
    id: "relationship",
    accessorFn: (row) => row.currentMember?.relationship ?? "",
    header: "Relationship",
    meta: { label: "Relationship" },
    cell: ({ row }) =>
      row.original.currentMember?.relationship ?? "Primary account holder",
  },
  {
    id: "primaryContact",
    accessorFn: (row) => row.primaryContact?.name ?? "",
    header: "Primary client",
    meta: { label: "Primary client" },
    cell: ({ row }) => row.original.primaryContact?.name ?? "Not assigned",
  },
  {
    id: "members",
    accessorFn: (row) =>
      row.members.map((member) => member.client.name).join(", "),
    header: "Household clients",
    meta: { label: "Household clients" },
    cell: ({ row }) => (
      <span className="block max-w-72 truncate">
        {row.original.members.map((member) => member.client.name).join(", ")}
      </span>
    ),
  },
  {
    accessorKey: "notes",
    header: "Notes",
    meta: { label: "Notes" },
    cell: ({ row }) => row.original.notes ?? "No notes",
  },
  {
    accessorKey: "updatedAt",
    header: "Last updated",
    meta: { label: "Last updated" },
    cell: ({ row }) => format(new Date(row.original.updatedAt), "d MMM yyyy"),
  },
];

export function MemberHouseholdsView({ clientId }: { clientId: string }) {
  const trpc = useTRPC();
  const householdsQuery = useQuery(
    trpc.households.getForClient.queryOptions({ clientId }),
  );

  return (
    <div className="py-5">
      <MemberDataTable
        columns={householdColumns}
        data={householdsQuery.data ?? []}
        getRowId={(household) => household.id}
        initialColumnOrder={HOUSEHOLD_COLUMN_ORDER}
        primaryColumnId="name"
        searchPlaceholder="Search households..."
        emptyLabel="This client is not part of a household."
        isLoading={householdsQuery.isLoading}
      />
    </div>
  );
}
