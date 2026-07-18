"use client";

import type {
  ColumnOrderState,
  Table,
  VisibilityState,
} from "@tanstack/react-table";

import {
  StudioTableToolbar,
  type SortOption,
} from "@/features/studio/components/studio-table-toolbar";
import { STAFF_ROLES } from "@/features/staff/constants";
import type { StaffRow } from "@/features/staff/types";

const STAFF_SORT_OPTIONS: SortOption[] = [
  { value: "createdAt.desc", label: "Newest first" },
  { value: "createdAt.asc", label: "Oldest first" },
  { value: "name.asc", label: "Name A-Z" },
  { value: "name.desc", label: "Name Z-A" },
  { value: "role.asc", label: "Role A-Z" },
  { value: "role.desc", label: "Role Z-A" },
];

type StaffTableToolbarProps = {
  columnOrder: ColumnOrderState;
  columnVisibility: VisibilityState;
  initialColumnOrder: ColumnOrderState;
  onColumnOrderChange: (order: ColumnOrderState) => void;
  onRolesChange: (roles: string[]) => void;
  onSearchChange: (search: string) => void;
  onSortChange: (sort: string) => void;
  onStatusChange: (status: boolean | null) => void;
  primaryColumnId: string;
  roles: string[];
  search: string;
  searchPlaceholder?: string;
  sort: string;
  status: boolean | null;
  table: Table<StaffRow>;
};

export function StaffTableToolbar({
  columnOrder,
  columnVisibility,
  initialColumnOrder,
  onColumnOrderChange,
  onRolesChange,
  onSearchChange,
  onSortChange,
  onStatusChange,
  primaryColumnId,
  roles,
  search,
  searchPlaceholder = "Search team members...",
  sort,
  status,
  table,
}: StaffTableToolbarProps): React.JSX.Element {
  return (
    <StudioTableToolbar
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder={searchPlaceholder}
      filterGroups={[
        {
          label: "Role",
          options: STAFF_ROLES.map((role) => ({
            value: role.value,
            label: role.label,
          })),
          selectedValues: roles,
          onChange: onRolesChange,
        },
        {
          label: "Status",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ],
          selectedValues:
            status === null ? [] : [status ? "active" : "inactive"],
          onChange: (values) => {
            const selected = values.at(-1);
            onStatusChange(
              selected === "active"
                ? true
                : selected === "inactive"
                  ? false
                  : null,
            );
          },
        },
      ]}
      sortOptions={STAFF_SORT_OPTIONS}
      sortValue={sort}
      onSortChange={onSortChange}
      table={table}
      columnVisibility={columnVisibility}
      columnOrder={columnOrder}
      onColumnOrderChange={onColumnOrderChange}
      initialColumnOrder={initialColumnOrder}
      primaryColumnId={primaryColumnId}
    />
  );
}
