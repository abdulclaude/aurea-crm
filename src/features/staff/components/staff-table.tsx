"use client";

import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import type {
  ColumnOrderState,
  ColumnDef,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { Edit, MoreHorizontal, Trash2 } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import * as React from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  isStaffRoleValue,
  type StaffRoleValue,
} from "@/features/staff/constants";
import { useTRPC } from "@/trpc/client";
import { useDeleteStaff } from "../hooks/use-staff";
import { STAFF_DEFAULT_SORT, useStaffParams } from "../hooks/use-staff-params";
import type { StaffRow } from "../types";
import { EditStaffDialog } from "./edit-staff-dialog";
import { StaffEmploymentTypeBadge, StaffRoleBadge } from "./staff-badges";
import { StaffTableToolbar } from "./staff-table-toolbar";

const TABLE_SORTABLE_COLUMNS = new Set(["name", "role"]);
type StaffSortValue =
  | "createdAt.desc"
  | "createdAt.asc"
  | "name.asc"
  | "name.desc"
  | "role.asc"
  | "role.desc";

const STAFF_SORT_VALUES: readonly StaffSortValue[] = [
  "createdAt.desc",
  "createdAt.asc",
  "name.asc",
  "name.desc",
  "role.asc",
  "role.desc",
];

function isStaffSortValue(value: string): value is StaffSortValue {
  return STAFF_SORT_VALUES.includes(value as StaffSortValue);
}

function sortValueToState(value?: string): SortingState {
  const sort = value || STAFF_DEFAULT_SORT;
  const [column, direction] = sort.split(".");
  if (!TABLE_SORTABLE_COLUMNS.has(column)) return [];
  return [{ id: column, desc: direction === "desc" }];
}

function sortingStateToValue(state: SortingState): string | null {
  const primary = state[0];
  if (!primary || !TABLE_SORTABLE_COLUMNS.has(primary.id)) return null;
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
    if (
      !window.confirm(
        `Delete ${staff.name}? This will remove them from staff lists.`,
      )
    ) {
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
    id: "name",
    accessorKey: "name",
    header: "Name",
    meta: { label: "Name" },
    enableSorting: true,
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="size-8 rounded-full bg-slate-100">
          {row.original.profilePhoto ? (
            <AvatarImage
              src={row.original.profilePhoto}
              alt={row.original.name}
            />
          ) : (
            <AvatarFallback className="rounded-full border border-slate-200 bg-slate-100 text-[9px] font-medium text-slate-800">
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
      <span className="text-xs text-primary/70">
        {row.original.email || "-"}
      </span>
    ),
  },
  {
    id: "phone",
    accessorKey: "phone",
    header: "Phone number",
    meta: { label: "Phone number" },
    cell: ({ row }) => (
      <span className="text-xs text-primary/70">
        {row.original.phone || "-"}
      </span>
    ),
  },
  {
    id: "role",
    accessorKey: "role",
    header: "Role",
    meta: { label: "Role" },
    enableSorting: true,
    cell: ({ row }) => <StaffRoleBadge role={row.original.role} />,
  },
  {
    id: "staffType",
    accessorKey: "employmentType",
    header: "Staff type",
    meta: { label: "Staff type" },
    cell: ({ row }) => {
      return (
        <StaffEmploymentTypeBadge
          employmentType={row.original.employmentType}
        />
      );
    },
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

export function StaffTable({
  canManage = false,
  scope = "studio",
}: {
  canManage?: boolean;
  scope?: "studio" | "all-locations";
}) {
  const trpc = useTRPC();
  const [params, setParams] = useStaffParams();
  const [selectedLocationId] = useQueryState(
    "locationId",
    parseAsString.withDefault(""),
  );
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
    React.useState<VisibilityState>(() => ({ actions: canManage }));
  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(STAFF_COLUMN_IDS);
  const sortingState = React.useMemo(
    () => sortValueToState(params.sort),
    [params.sort],
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
      columnOrder={columnOrder}
      onColumnOrderChange={setColumnOrder}
      initialColumnOrder={STAFF_COLUMN_IDS}
      enableGlobalSearch={false}
      emptyState={
        <div className="py-12 text-center text-xs text-primary/60">
          No staff found.
        </div>
      }
      toolbar={{
        filters: (ctx) => (
          <StaffTableToolbar
            search={params.search}
            onSearchChange={(search) =>
              setParams((prev) => ({ ...prev, search, page: 1 }))
            }
            sort={sortValue}
            onSortChange={(sort) => setParams((prev) => ({ ...prev, sort }))}
            roles={selectedRoles}
            onRolesChange={(roles) =>
              setParams((prev) => ({ ...prev, roles, page: 1 }))
            }
            status={params.isActive ?? null}
            onStatusChange={(isActive) =>
              setParams((prev) => ({ ...prev, isActive, page: 1 }))
            }
            table={ctx.table}
            columnVisibility={columnVisibility}
            columnOrder={columnOrder}
            onColumnOrderChange={setColumnOrder}
            initialColumnOrder={STAFF_COLUMN_IDS}
            primaryColumnId="name"
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
