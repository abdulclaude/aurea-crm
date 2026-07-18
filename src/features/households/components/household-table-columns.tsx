import type { ColumnDef } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AppRouter } from "@/trpc/routers/_app";
import { HouseholdRowActions } from "./household-row-actions";

export type HouseholdRow =
  inferRouterOutputs<AppRouter>["households"]["list"][number];

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export const householdColumns: ColumnDef<HouseholdRow>[] = [
  {
    id: "name",
    accessorFn: (row) => row.name,
    header: "Household",
    meta: { label: "Household" },
    enableHiding: false,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-primary">
          {row.original.name}
        </p>
        <p className="text-[10px] text-primary/45">
          {row.original.members.length} client
          {row.original.members.length === 1 ? "" : "s"}
        </p>
      </div>
    ),
  },
  {
    id: "primaryContact",
    accessorFn: (row) => row.primaryContact?.name ?? "",
    header: "Primary client",
    meta: { label: "Primary client" },
    cell: ({ row }) => {
      const primary = row.original.primaryContact;
      if (!primary) return <span className="text-xs text-primary/40">Not assigned</span>;
      return (
        <Link
          href={`/clients/${primary.id}`}
          className="group flex min-w-0 items-center gap-2"
        >
          <Avatar className="size-7">
            <AvatarImage src={primary.logo ?? undefined} alt={primary.name} />
            <AvatarFallback className="border border-slate-200 bg-slate-100 text-[9px] font-medium text-slate-800">
              {initials(primary.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-primary group-hover:underline">
              {primary.name}
            </p>
            <p className="truncate text-[10px] text-primary/45">
              {primary.email ?? primary.phone ?? "No contact details"}
            </p>
          </div>
        </Link>
      );
    },
  },
  {
    id: "members",
    accessorFn: (row) => row.members.map((member) => member.client.name).join(" "),
    header: "Clients",
    meta: { label: "Clients" },
    cell: ({ row }) => (
      <div className="flex min-w-40 items-center -space-x-2 py-1">
        {row.original.members.slice(0, 6).map((member, index) => (
          <Link
            key={member.id}
            href={`/clients/${member.clientId}`}
            title={member.client.name}
            style={{ zIndex: row.original.members.length - index }}
            className="relative rounded-full transition-transform hover:-translate-y-0.5"
          >
            <Avatar className="size-8 rounded-full bg-slate-100">
              <AvatarImage
                src={member.client.logo ?? undefined}
                alt={member.client.name}
              />
              <AvatarFallback className="rounded-full border border-slate-200 bg-slate-100 text-[9px] font-medium text-slate-800">
                {initials(member.client.name)}
              </AvatarFallback>
            </Avatar>
          </Link>
        ))}
        {row.original.members.length > 6 ? (
          <span className="relative flex size-8 items-center justify-center rounded-full bg-slate-100 text-[9px] font-medium text-slate-600">
            +{row.original.members.length - 6}
          </span>
        ) : null}
        {!row.original.members.length ? (
          <span className="text-xs text-primary/40">No linked clients</span>
        ) : null}
      </div>
    ),
  },
  {
    id: "notes",
    accessorFn: (row) => row.notes ?? "",
    header: "Notes",
    meta: { label: "Notes" },
    cell: ({ row }) => (
      <span className="block max-w-64 truncate text-xs text-primary/65">
        {row.original.notes || "No notes"}
      </span>
    ),
  },
  {
    id: "updatedAt",
    accessorFn: (row) => row.updatedAt,
    header: "Last updated",
    meta: { label: "Last updated" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs text-primary/60">
        {format(new Date(row.original.updatedAt), "d MMM yyyy")}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => <HouseholdRowActions household={row.original} />,
  },
];
