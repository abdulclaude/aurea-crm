"use client";

import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import type {
  ColumnDef,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { Edit, MoreHorizontal, Trash2 } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import * as React from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getStaffRoleLabel,
  getStaffTypeLabel,
  isStaffRoleValue,
  type StaffRoleValue,
} from "@/features/staff/constants";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useDeleteStaff } from "../hooks/use-staff";
import {
  STAFF_DEFAULT_SORT,
  useStaffParams,
} from "../hooks/use-staff-params";
import type { StaffRow } from "../types";
import { EditStaffDialog } from "./edit-staff-dialog";
import { StaffToolbar, type StaffToolbarFilters } from "./staff-toolbar";

const SORTABLE_COLUMNS = new Set(["createdAt", "name", "role", "staffType"]);
type StaffSortValue =
  | "createdAt.desc"
  | "createdAt.asc"
  | "name.asc"
  | "name.desc"
  | "role.asc"
  | "role.desc"
  | "staffType.asc"
  | "staffType.desc";

const STAFF_SORT_VALUES: readonly StaffSortValue[] = [
  "createdAt.desc",
  "createdAt.asc",
  "name.asc",
  "name.desc",
  "role.asc",
  "role.desc",
  "staffType.asc",
  "staffType.desc",
];

function isStaffSortValue(value: string): value is StaffSortValue {
  return STAFF_SORT_VALUES.includes(value as StaffSortValue);
}

function sortValueToState(value?: string): SortingState {
  const sort = value || STAFF_DEFAULT_SORT;
  const [column, direction] = sort.split(".");
  if (!SORTABLE_COLUMNS.has(column)) return [];
  return [{ id: column, desc: direction === "desc" }];
}

function sortingStateToValue(state: SortingState): string | null {
  const primary = state[0];
  if (!primary || !SORTABLE_COLUMNS.has(primary.id)) return null;
  return `${primary.id}.${primary.desc ? "desc" : "asc"}`;
}

function initialsFor(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getRoleBadgeColor(role: string | null): string {
  const colors: Record<string, string> = {
    ADMIN: "bg-blue-100 text-blue-600 ring-blue-300 dark:border-blue-800",
    MANAGER: "bg-teal-100 text-teal-600 ring-teal-300 dark:border-teal-800",
    INSTRUCTOR:
      "bg-emerald-100 text-emerald-600 ring-emerald-300 dark:border-emerald-800",
    FRONT_DESK:
      "bg-amber-100 text-amber-600 ring-amber-200 dark:border-amber-800",
  };
  return colors[role ?? ""] ?? "bg-gray-100 text-gray-500 ring-gray-200";
}

function StaffActionsCell({ staff }: { staff: StaffRow }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [editingStaff, setEditingStaff] = React.useState<StaffRow | null>(null);
  const { mutate: deleteStaff } = useDeleteStaff();

  const invalidateStaff = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.staff.list.queryKey() }),
      queryClient.invalidateQueries({
        queryKey: trpc.staff.filterOptions.queryKey(),
      }),
    ]);
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete ${staff.name}? This will remove them from staff lists.`)) {
      return;
    }

    deleteStaff(
      { id: staff.id },
      {
        onSuccess: async () => {
          await invalidateStaff();
          toast.success("Staff member deleted");
        },
        onError: (error) => {
          toast.error(error.message || "Failed to delete staff member");
        },
      },
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="size-8 p-0 hover:bg-primary/5">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-background">
          <DropdownMenuLabel className="text-xs text-primary/80">
            Actions
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-xs"
            onClick={() => setEditingStaff(staff)}
          >
            <Edit className="mr-1 size-3.5" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer text-xs text-rose-600 hover:text-rose-700"
            onClick={handleDelete}
          >
            <Trash2 className="mr-1 size-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {editingStaff && (
        <EditStaffDialog
          staff={editingStaff}
          open={!!editingStaff}
          onOpenChange={(open) => {
            if (!open) setEditingStaff(null);
          }}
          onSuccess={async () => {
            await invalidateStaff();
            setEditingStaff(null);
          }}
        />
      )}
    </>
  );
}

const staffColumns: ColumnDef<StaffRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        onClick={(event) => event.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "name",
    accessorKey: "name",
    header: "Name",
    meta: { label: "Name" },
    enableSorting: true,
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="size-9">
          {row.original.profilePhoto ? (
            <AvatarImage src={row.original.profilePhoto} alt={row.original.name} />
          ) : (
            <AvatarFallback className="text-[11px]">
              {initialsFor(row.original.name)}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{row.original.name}</p>
        </div>
      </div>
    ),
  },
  {
    id: "email",
    accessorKey: "email",
    header: "Email",
    meta: { label: "Email" },
    cell: ({ row }) => (
      <span className="text-xs text-primary/70">{row.original.email || "-"}</span>
    ),
  },
  {
    id: "phone",
    accessorKey: "phone",
    header: "Phone",
    meta: { label: "Phone" },
    cell: ({ row }) => (
      <span className="text-xs text-primary/70">{row.original.phone || "-"}</span>
    ),
  },
  {
    id: "role",
    accessorKey: "staffType",
    header: "Role",
    meta: { label: "Role" },
    enableSorting: true,
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={cn("w-fit text-[11px]", getRoleBadgeColor(row.original.role))}
      >
        {getStaffTypeLabel(row.original.staffType)}
      </Badge>
    ),
  },
  {
    id: "employeeId",
    accessorKey: "employeeId",
    header: "Employee ID",
    meta: { label: "Employee ID" },
    cell: ({ row }) => (
      <span className="text-xs text-primary/70">{row.original.employeeId || "-"}</span>
    ),
  },
  {
    id: "isActive",
    accessorKey: "isActive",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={cn(
          "text-[11px]",
          row.original.isActive
            ? "bg-emerald-100 text-emerald-600 ring-emerald-300"
            : "bg-rose-100 text-rose-600 ring-rose-300",
        )}
      >
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
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
        {format(new Date(row.original.createdAt), "MMM d, yy")}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <StaffActionsCell staff={row.original} />,
    enableSorting: false,
    enableHiding: false,
  },
];

const STAFF_COLUMN_IDS = staffColumns.map(
  (column, index) => (column.id ?? `column-${index}`) as string,
);

export function StaffTable({ scope = "studio" }: { scope?: "studio" | "all-locations" }) {
  const trpc = useTRPC();
  const [params, setParams] = useStaffParams();
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [selectedLocationId] = useQueryState("locationId", parseAsString.withDefault(""));
  const includeAllLocations = scope === "all-locations" && !selectedLocationId;
  const selectedRoles = React.useMemo<StaffRoleValue[]>(
    () => params.roles.filter(isStaffRoleValue),
    [params.roles],
  );
  const sortValue = isStaffSortValue(params.sort)
    ? params.sort
    : STAFF_DEFAULT_SORT;

  const listInput = {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search || undefined,
    roles: selectedRoles.length > 0 ? selectedRoles : undefined,
    staffTypes: params.staffTypes.length > 0 ? params.staffTypes : undefined,
    isActive: params.isActive ?? undefined,
    sort: sortValue,
    ...(scope === "all-locations"
      ? {
          includeAllLocations,
          locationId: selectedLocationId || undefined,
        }
      : {}),
  };

  const { data, isFetching } = useSuspenseQuery(
    trpc.staff.list.queryOptions(listInput),
  );

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const sortingState = React.useMemo(
    () => sortValueToState(params.sort),
    [params.sort],
  );

  const handleApplyFilters = React.useCallback(
    (filters: StaffToolbarFilters) => {
      setParams((prev) => ({
        ...prev,
        page: 1,
        roles: filters.roles,
        staffTypes: filters.staffTypes,
        isActive: filters.status,
      }));
    },
    [setParams],
  );

  return (
    <DataTable
      data={data.items}
      columns={staffColumns}
      isLoading={isFetching}
      getRowId={(row) => row.id}
      sorting={sortingState}
      onSortingChange={(state) =>
        setParams((prev) => ({
          ...prev,
          sort: sortingStateToValue(state) ?? STAFF_DEFAULT_SORT,
        }))
      }
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={setColumnVisibility}
      initialColumnOrder={STAFF_COLUMN_IDS}
      enableGlobalSearch={false}
      enableRowSelection
      rowSelection={rowSelection}
      onRowSelectionChange={setRowSelection}
      emptyState={
        <div className="py-12 text-center text-xs text-primary/60">
          No staff found.
        </div>
      }
      toolbar={{
        filters: (ctx) => (
          <StaffToolbar
            search={params.search}
            onSearchChange={(search) =>
              setParams((prev) => ({ ...prev, search, page: 1 }))
            }
            sortValue={sortValue}
            onSortChange={(sort) => setParams((prev) => ({ ...prev, sort }))}
            selectedRoles={selectedRoles}
            selectedStaffTypes={params.staffTypes}
            selectedStatus={params.isActive ?? null}
            onApplyFilters={handleApplyFilters}
            table={ctx.table}
            columnVisibility={columnVisibility}
            columnOrder={STAFF_COLUMN_IDS}
            selectedLocationId={selectedLocationId || undefined}
            includeAllLocations={includeAllLocations}
          />
        ),
      }}
      pagination={{
        currentPage: data.pagination.currentPage,
        totalPages: data.pagination.totalPages,
        pageSize: data.pagination.pageSize,
        totalItems: data.pagination.totalItems,
        onPageChange: (page) => setParams((prev) => ({ ...prev, page })),
        onPageSizeChange: (pageSize) =>
          setParams((prev) => ({ ...prev, pageSize, page: 1 })),
      }}
    />
  );
}
