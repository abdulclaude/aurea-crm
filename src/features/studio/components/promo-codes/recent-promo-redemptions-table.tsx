"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnOrderState, VisibilityState } from "@tanstack/react-table";
import { ReceiptText } from "lucide-react";
import * as React from "react";

import { DataTable } from "@/components/data-table/data-table";
import { StudioTableToolbar } from "@/features/studio/components/studio-table-toolbar";
import { useTRPC } from "@/trpc/client";
import { createRecentPromoRedemptionColumns } from "./recent-promo-redemption-columns";

const COLUMN_ORDER_KEY = "promo-redemptions.column-order";
const PRIMARY_COLUMN_ID = "name";
const DEFAULT_COLUMN_ORDER = [
  "name",
  "promoCode",
  "discount",
  "originalPrice",
  "newPrice",
  "redeemedOn",
  "pricingOption",
  "status",
] as const;

export function RecentPromoRedemptionsTable(): React.ReactElement {
  const trpc = useTRPC();
  const redemptionsQuery = useQuery(
    trpc.promoCodes.listRedemptions.queryOptions({ limit: 100 }),
  );
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("redeemed.desc");
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);

  const rows = React.useMemo(() => {
    let result = redemptionsQuery.data ?? [];
    if (statusFilter.length > 0) {
      result = result.filter((row) => statusFilter.includes(row.status));
    }
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((row) =>
        [row.memberName, row.memberEmail, row.promoCode, row.pricingOptionName]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(query)),
      );
    }
    const [column, direction] = sort.split(".");
    result = [...result].sort((a, b) => {
      let comparison = 0;
      if (column === "redeemed") {
        comparison =
          new Date(a.redeemedAt).getTime() - new Date(b.redeemedAt).getTime();
      }
      if (column === "name") {
        comparison = (a.memberName ?? "").localeCompare(b.memberName ?? "");
      }
      if (column === "promo") comparison = a.promoCode.localeCompare(b.promoCode);
      return direction === "desc" ? -comparison : comparison;
    });
    return result;
  }, [redemptionsQuery.data, search, sort, statusFilter]);

  const columns = React.useMemo(createRecentPromoRedemptionColumns, []);

  React.useEffect(() => {
    setColumnOrder([...DEFAULT_COLUMN_ORDER]);
    try {
      const stored = window.localStorage.getItem(COLUMN_ORDER_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setColumnOrder(parsed.filter((item): item is string => typeof item === "string"));
        }
      }
    } catch {}
  }, []);

  const resolvedColumnOrder =
    columnOrder.length > 0 ? columnOrder : [...DEFAULT_COLUMN_ORDER];

  return (
    <DataTable
      columns={columns}
      data={rows}
      isLoading={redemptionsQuery.isLoading}
      getRowId={(row) => row.id}
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={(updater) =>
        setColumnVisibility(
          typeof updater === "function"
            ? (updater as (state: VisibilityState) => VisibilityState)(
                columnVisibility,
              )
            : updater,
        )
      }
      columnOrder={resolvedColumnOrder}
      onColumnOrderChange={(order) => {
        setColumnOrder(order);
        try {
          window.localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(order));
        } catch {}
      }}
      initialColumnOrder={[...DEFAULT_COLUMN_ORDER]}
      enableGlobalSearch={false}
      toolbar={{
        filters: (ctx) => (
          <StudioTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search redemptions..."
            filterGroups={[
              {
                label: "Status",
                options: [
                  { value: "SUCCEEDED", label: "Succeeded" },
                  { value: "PENDING", label: "Pending" },
                  { value: "REFUNDED", label: "Refunded" },
                  { value: "FAILED", label: "Failed" },
                  { value: "CANCELLED", label: "Cancelled" },
                ],
                selectedValues: statusFilter,
                onChange: setStatusFilter,
              },
            ]}
            sortOptions={[
              { value: "redeemed.desc", label: "Recently redeemed" },
              { value: "redeemed.asc", label: "Oldest redeemed" },
              { value: "name.asc", label: "Name A-Z" },
              { value: "name.desc", label: "Name Z-A" },
              { value: "promo.asc", label: "Promo code A-Z" },
            ]}
            sortValue={sort}
            onSortChange={setSort}
            table={ctx.table}
            columnVisibility={columnVisibility}
            columnOrder={resolvedColumnOrder}
            onColumnOrderChange={(order: ColumnOrderState) => {
              setColumnOrder(order);
              try {
                window.localStorage.setItem(
                  COLUMN_ORDER_KEY,
                  JSON.stringify(order),
                );
              } catch {}
            }}
            initialColumnOrder={[...DEFAULT_COLUMN_ORDER]}
            primaryColumnId={PRIMARY_COLUMN_ID}
          />
        ),
      }}
      emptyState={
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <ReceiptText className="size-8 text-primary/20" />
          <p className="text-sm text-primary/50">No recorded redemptions found.</p>
        </div>
      }
    />
  );
}
