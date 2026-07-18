"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type {
  ColumnOrderState,
  Updater,
  VisibilityState,
} from "@tanstack/react-table";
import { Users } from "lucide-react";
import * as React from "react";

import { DataTable } from "@/components/data-table/data-table";
import { useTRPC } from "@/trpc/client";
import {
  householdColumns,
  type HouseholdRow,
} from "./household-table-columns";
import { HouseholdsToolbar } from "./households-toolbar";

const HOUSEHOLD_COLUMN_IDS = householdColumns.map(
  (column, index) => column.id ?? `column-${index}`,
);
const COLUMN_ORDER_KEY = "households-table.column-order";
const DEFAULT_SORT = "updatedAt.desc";

export function HouseholdsTable() {
  const trpc = useTRPC();
  const { data: households } = useSuspenseQuery(
    trpc.households.list.queryOptions(),
  );
  const [search, setSearch] = React.useState("");
  const [sortValue, setSortValue] = React.useState(DEFAULT_SORT);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(HOUSEHOLD_COLUMN_IDS);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COLUMN_ORDER_KEY);
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      if (
        Array.isArray(parsed) &&
        parsed.every((value): value is string => typeof value === "string")
      ) {
        setColumnOrder(parsed);
      }
    } catch {
      window.localStorage.removeItem(COLUMN_ORDER_KEY);
    }
  }, []);

  const handleColumnOrderChange = React.useCallback(
    (updater: Updater<ColumnOrderState> | ColumnOrderState) => {
      setColumnOrder((current) => {
        const next =
          typeof updater === "function" ? updater(current) : updater;
        if (
          next.length === HOUSEHOLD_COLUMN_IDS.length &&
          next.every((id, index) => id === HOUSEHOLD_COLUMN_IDS[index])
        ) {
          window.localStorage.removeItem(COLUMN_ORDER_KEY);
        } else {
          window.localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(next));
        }
        return next;
      });
    },
    [],
  );

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = query
      ? households.filter(
          (household) =>
            household.name.toLowerCase().includes(query) ||
            household.primaryContact?.name?.toLowerCase().includes(query) ||
            household.primaryContact?.email?.toLowerCase().includes(query) ||
            household.members.some(
              (member) =>
                member.client.name.toLowerCase().includes(query) ||
                member.client.email?.toLowerCase().includes(query),
            ),
        )
      : [...households];
    const [column, direction] = sortValue.split(".");
    result.sort((left, right) => {
      const comparison =
        column === "name"
          ? left.name.localeCompare(right.name)
          : column === "members"
            ? left.members.length - right.members.length
            : new Date(left.updatedAt).getTime() -
              new Date(right.updatedAt).getTime();
      return direction === "desc" ? -comparison : comparison;
    });
    return result;
  }, [households, search, sortValue]);

  return (
    <DataTable<HouseholdRow, unknown>
      columns={householdColumns}
      data={filtered}
      getRowId={(row) => row.id}
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={setColumnVisibility}
      columnOrder={columnOrder}
      onColumnOrderChange={handleColumnOrderChange}
      initialColumnOrder={HOUSEHOLD_COLUMN_IDS}
      enableGlobalSearch={false}
      toolbar={{
        filters: (context) => (
          <HouseholdsToolbar
            search={search}
            onSearchChange={setSearch}
            sortValue={sortValue}
            onSortChange={setSortValue}
            table={context.table}
            columnVisibility={columnVisibility}
            columnOrder={columnOrder}
            onColumnOrderChange={handleColumnOrderChange}
            initialColumnOrder={HOUSEHOLD_COLUMN_IDS}
          />
        ),
      }}
      emptyState={
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="mb-3 size-8 text-primary/20" />
          <p className="text-sm font-medium text-primary">No households found</p>
          <p className="mt-1 text-xs text-primary/55">
            Create a household or adjust your search.
          </p>
        </div>
      }
    />
  );
}
