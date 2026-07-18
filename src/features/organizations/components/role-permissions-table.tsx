"use client";

import type {
  ColumnDef,
  ColumnOrderState,
  VisibilityState,
} from "@tanstack/react-table";
import * as React from "react";

import { DataTable } from "@/components/data-table/data-table";
import { TABLE_BADGE_COLORS, TableBadge } from "@/components/ui/table-badge";
import {
  AGENCY_ROLES,
  LOCATION_ROLES,
} from "@/features/organizations/members/constants";
import { StudioTableToolbar } from "@/features/studio/components/studio-table-toolbar";

type RolePermissionRow = {
  description: string;
  id: string;
  label: string;
  permissions: readonly string[];
  scope: "WORKSPACE" | "STUDIO";
};

const ROLE_COLUMN_ORDER = ["role", "scope", "description", "permissions"];

const ROLE_COLORS: Record<string, string> = {
  owner: TABLE_BADGE_COLORS.indigo,
  admin: TABLE_BADGE_COLORS.blue,
  manager: TABLE_BADGE_COLORS.cyan,
  viewer: TABLE_BADGE_COLORS.slate,
  ADMIN: TABLE_BADGE_COLORS.orange,
  MANAGER: TABLE_BADGE_COLORS.teal,
  STANDARD: TABLE_BADGE_COLORS.emerald,
  LIMITED: TABLE_BADGE_COLORS.amber,
  VIEWER: TABLE_BADGE_COLORS.slate,
};

const WORKSPACE_ROLE_VALUES = new Set(["owner", "admin", "manager", "viewer"]);
const STUDIO_ROLE_LABELS: Record<string, string> = {
  ADMIN: "Studio manager",
  MANAGER: "Studio staff",
  STANDARD: "Instructor",
  LIMITED: "Front desk",
  VIEWER: "Studio viewer",
};

const ROLE_ROWS: RolePermissionRow[] = [
  ...AGENCY_ROLES.filter((role) => WORKSPACE_ROLE_VALUES.has(role.value)).map(
    (role) => ({
      ...role,
      id: `workspace:${role.value}`,
      scope: "WORKSPACE" as const,
    }),
  ),
  ...LOCATION_ROLES.filter((role) => role.value in STUDIO_ROLE_LABELS).map(
    (role) => ({
      ...role,
      id: `studio:${role.value}`,
      label: STUDIO_ROLE_LABELS[role.value] ?? role.label,
      scope: "STUDIO" as const,
    }),
  ),
];

const roleColumns: ColumnDef<RolePermissionRow>[] = [
  {
    id: "role",
    accessorKey: "label",
    header: "Role",
    meta: { label: "Role" },
    enableHiding: false,
    cell: ({ row }) => (
      <TableBadge
        color={
          ROLE_COLORS[row.original.id.split(":")[1] ?? ""] ??
          TABLE_BADGE_COLORS.slate
        }
      >
        {row.original.label}
      </TableBadge>
    ),
  },
  {
    id: "scope",
    accessorKey: "scope",
    header: "Scope",
    meta: { label: "Scope" },
    cell: ({ row }) => (
      <span className="text-xs text-primary/65">
        {row.original.scope === "WORKSPACE" ? "Workspace" : "Studio"}
      </span>
    ),
  },
  {
    id: "description",
    accessorKey: "description",
    header: "Access summary",
    meta: { label: "Access summary" },
    cell: ({ row }) => (
      <span className="text-xs text-primary/65">
        {row.original.description}
      </span>
    ),
  },
  {
    id: "permissions",
    accessorFn: (row) => row.permissions.join(" "),
    header: "Permissions",
    meta: { label: "Permissions" },
    cell: ({ row }) => (
      <ul
        className="w-80 max-w-[calc(100vw-4rem)] space-y-1 whitespace-normal text-xs leading-4 text-primary/60"
        title={row.original.permissions.join("; ")}
      >
        {row.original.permissions.map((permission) => (
          <li key={permission} className="break-words">
            {permission}
          </li>
        ))}
      </ul>
    ),
  },
];

export function RolePermissionsTable(): React.JSX.Element {
  const [search, setSearch] = React.useState("");
  const [scopes, setScopes] = React.useState<string[]>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(ROLE_COLUMN_ORDER);
  const rows = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return ROLE_ROWS.filter((row) => {
      if (scopes.length > 0 && !scopes.includes(row.scope)) return false;
      if (!query) return true;
      return [row.label, row.description, ...row.permissions]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [scopes, search]);

  return (
    <DataTable
      columns={roleColumns}
      data={rows}
      getRowId={(row) => row.id}
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={setColumnVisibility}
      columnOrder={columnOrder}
      onColumnOrderChange={setColumnOrder}
      initialColumnOrder={ROLE_COLUMN_ORDER}
      enableGlobalSearch={false}
      toolbar={{
        filters: ({ table }) => (
          <StudioTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search roles and permissions..."
            filterGroups={[
              {
                label: "Scope",
                options: [
                  { value: "WORKSPACE", label: "Workspace" },
                  { value: "STUDIO", label: "Studio" },
                ],
                selectedValues: scopes,
                onChange: setScopes,
              },
            ]}
            table={table}
            columnVisibility={columnVisibility}
            columnOrder={columnOrder}
            onColumnOrderChange={setColumnOrder}
            initialColumnOrder={ROLE_COLUMN_ORDER}
            primaryColumnId="role"
          />
        ),
      }}
      emptyState={
        <div className="py-12 text-center text-xs text-primary/50">
          No roles match this view.
        </div>
      }
    />
  );
}
