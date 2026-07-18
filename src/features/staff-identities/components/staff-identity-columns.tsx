import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StaffIdentityActions } from "@/features/staff-identities/components/staff-identity-actions";
import { StaffIdentityStatusBadge } from "@/features/staff-identities/components/staff-identity-status-badge";
import type { StaffIdentityRow } from "@/features/staff-identities/contracts";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function getStaffIdentityColumns(
  canManage: boolean,
): ColumnDef<StaffIdentityRow>[] {
  return [
    {
      id: "name",
      accessorKey: "displayName",
      header: "Name",
      meta: { label: "Name" },
      enableSorting: true,
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className="text-[11px]">
              {initials(row.original.displayName)}
            </AvatarFallback>
          </Avatar>
          <p className="truncate text-xs font-medium text-primary">
            {row.original.displayName}
          </p>
        </div>
      ),
    },
    {
      id: "email",
      accessorKey: "email",
      header: "Email",
      meta: { label: "Email" },
      cell: ({ row }) => (
        <span className="text-xs text-primary/70">
          {row.original.email ?? "-"}
        </span>
      ),
    },
    {
      id: "phone",
      accessorKey: "phone",
      header: "Phone",
      meta: { label: "Phone" },
      cell: ({ row }) => (
        <span className="text-xs text-primary/70">
          {row.original.phone ?? "-"}
        </span>
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      meta: { label: "Status" },
      enableSorting: true,
      cell: ({ row }) => (
        <StaffIdentityStatusBadge status={row.original.status} />
      ),
    },
    {
      id: "profiles",
      header: "Access and profiles",
      meta: { label: "Access and profiles" },
      cell: ({ row }) => (
        <div className="flex max-w-md flex-wrap gap-1.5">
          {row.original.sources.length > 0 ? (
            row.original.sources.map((source) => (
              <Badge
                key={`${source.sourceType}-${source.sourceId}`}
                variant="outline"
                className="max-w-full gap-1 text-[10px] font-normal"
              >
                <span className="truncate">{source.label}</span>
                {source.role ? (
                  <span className="text-primary/50">{source.role}</span>
                ) : null}
              </Badge>
            ))
          ) : (
            <span className="text-[11px] text-primary/50">
              No linked records
            </span>
          )}
        </div>
      ),
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: "Added",
      meta: { label: "Added" },
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-xs text-primary/60">
          {format(row.original.createdAt, "MMM d, yy")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) =>
        canManage ? <StaffIdentityActions identity={row.original} /> : null,
    },
  ];
}
