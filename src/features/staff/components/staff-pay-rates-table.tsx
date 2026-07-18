"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type { ColumnOrderState, VisibilityState } from "@tanstack/react-table";
import { parseAsString, useQueryState } from "nuqs";
import * as React from "react";

import { DataTable } from "@/components/data-table/data-table";
import {
  isStaffRoleValue,
  type StaffRoleValue,
} from "@/features/staff/constants";
import { useStaffParams } from "@/features/staff/hooks/use-staff-params";
import { useTRPC } from "@/trpc/client";

import {
  STAFF_PAY_RATE_COLUMN_ORDER,
  staffPayRateColumns,
} from "./staff-pay-rate-columns";
import { StaffTableToolbar } from "./staff-table-toolbar";

const PAY_RATE_SORT_VALUES = [
  "createdAt.desc",
  "createdAt.asc",
  "name.asc",
  "name.desc",
  "role.asc",
  "role.desc",
] as const;

type PayRateSortValue = (typeof PAY_RATE_SORT_VALUES)[number];

function isPayRateSortValue(value: string): value is PayRateSortValue {
  return PAY_RATE_SORT_VALUES.some((sort) => sort === value);
}

export function StaffPayRatesTable({
  canManage = false,
  scope = "studio",
}: {
  canManage?: boolean;
  scope?: "studio" | "all-locations";
}): React.JSX.Element {
  const trpc = useTRPC();
  const [params, setParams] = useStaffParams();
  const [selectedLocationId] = useQueryState(
    "locationId",
    parseAsString.withDefault(""),
  );
  const includeAllLocations = scope === "all-locations" && !selectedLocationId;
  const sort = isPayRateSortValue(params.sort) ? params.sort : "createdAt.desc";
  const roles = React.useMemo<StaffRoleValue[]>(
    () => params.roles.filter(isStaffRoleValue),
    [params.roles],
  );
  const { data, isFetching } = useSuspenseQuery(
    trpc.staff.list.queryOptions({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search || undefined,
      roles: roles.length > 0 ? roles : undefined,
      isActive: params.isActive ?? undefined,
      sort,
      ...(scope === "all-locations"
        ? {
            includeAllLocations,
            locationId: selectedLocationId || undefined,
          }
        : {}),
    }),
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => ({ actions: canManage }));
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>(
    STAFF_PAY_RATE_COLUMN_ORDER,
  );

  return (
    <DataTable
      columns={staffPayRateColumns}
      data={data.items}
      getRowId={(row) => row.id}
      isLoading={isFetching}
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={setColumnVisibility}
      columnOrder={columnOrder}
      onColumnOrderChange={setColumnOrder}
      initialColumnOrder={STAFF_PAY_RATE_COLUMN_ORDER}
      enableGlobalSearch={false}
      toolbar={{
        filters: ({ table }) => (
          <StaffTableToolbar
            search={params.search}
            onSearchChange={(search) =>
              setParams((previous) => ({ ...previous, search, page: 1 }))
            }
            searchPlaceholder="Search team pay rates..."
            roles={roles}
            onRolesChange={(nextRoles) =>
              setParams((previous) => ({
                ...previous,
                roles: nextRoles,
                page: 1,
              }))
            }
            status={params.isActive ?? null}
            onStatusChange={(isActive) =>
              setParams((previous) => ({ ...previous, isActive, page: 1 }))
            }
            sort={sort}
            onSortChange={(sort) =>
              setParams((previous) => ({ ...previous, sort, page: 1 }))
            }
            table={table}
            columnVisibility={columnVisibility}
            columnOrder={columnOrder}
            onColumnOrderChange={setColumnOrder}
            initialColumnOrder={STAFF_PAY_RATE_COLUMN_ORDER}
            primaryColumnId="name"
          />
        ),
      }}
      emptyState={
        <div className="py-12 text-center text-xs text-primary/50">
          No team pay rates found.
        </div>
      }
      pagination={{
        currentPage: data.pagination.currentPage,
        totalPages: data.pagination.totalPages,
        pageSize: data.pagination.pageSize,
        totalItems: data.pagination.totalItems,
        onPageChange: (page) =>
          setParams((previous) => ({ ...previous, page })),
        onPageSizeChange: (pageSize) =>
          setParams((previous) => ({ ...previous, pageSize, page: 1 })),
      }}
    />
  );
}
