"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import type { ColumnDef, ColumnOrderState, VisibilityState } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { Trash2, Users } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { IntroOffersToolbar } from "./intro-offers-toolbar";

type RouterOutput = inferRouterOutputs<AppRouter>;
type OfferRow = RouterOutput["introOffers"]["list"][number];

const OFFER_TYPE_LABELS: Record<string, string> = {
  TRIAL_CLASSES: "Trial classes",
  UNLIMITED_TRIAL: "Unlimited trial",
  DISCOUNTED_PACK: "Discounted pack",
  FREE_CLASS: "Free class",
  FIRST_MONTH_DISCOUNT: "First month discount",
};

const DEFAULT_SORT = "createdAt.desc";
const PRIMARY_COLUMN_ID = "name";
const COLUMN_ORDER_KEY = "intro-offers-table.column-order";

function buildColumns(
  onToggle: (id: string, isActive: boolean) => void,
  onDelete: (id: string) => void,
): ColumnDef<OfferRow>[] {
  return [
    {
      id: "name",
      accessorFn: (row) => row.name,
      header: "Offer",
      meta: { label: "Offer" },
      enableHiding: false,
      enableSorting: true,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-xs font-medium text-primary truncate">{row.original.name}</p>
          <p className="text-[11px] text-primary/50">{row.original.durationDays} days</p>
        </div>
      ),
    },
    {
      id: "offerType",
      accessorFn: (row) => row.offerType,
      header: "Type",
      meta: { label: "Type" },
      enableSorting: true,
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[10px]">
          {OFFER_TYPE_LABELS[row.original.offerType] ?? row.original.offerType}
        </Badge>
      ),
    },
    {
      id: "price",
      accessorFn: (row) => Number(row.price),
      header: "Price",
      meta: { label: "Price" },
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-xs text-primary/70 whitespace-nowrap">
          {row.original.currency} {Number(row.original.price).toFixed(2)}
        </span>
      ),
    },
    {
      id: "redeemed",
      accessorFn: (row) => row._count.redemptions,
      header: "Redeemed",
      meta: { label: "Redeemed" },
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-xs text-primary/50 flex items-center gap-1 whitespace-nowrap">
          <Users className="size-3" />
          {row.original._count.redemptions}
          {row.original.maxRedemptions ? ` / ${row.original.maxRedemptions}` : ""}
        </span>
      ),
    },
    {
      id: "isActive",
      accessorFn: (row) => row.isActive,
      header: "Active",
      meta: { label: "Active" },
      cell: ({ row }) => (
        <Switch
          checked={row.original.isActive}
          onCheckedChange={() => onToggle(row.original.id, row.original.isActive)}
        />
      ),
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-primary/40 hover:text-destructive"
          onClick={() => onDelete(row.original.id)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      ),
    },
  ];
}

export function IntroOffersTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [sortValue, setSortValue] = React.useState(DEFAULT_SORT);
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);
  const [selectedActive, setSelectedActive] = React.useState<string[]>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);

  const { data: offers, isFetching } = useSuspenseQuery(trpc.introOffers.list.queryOptions());

  const updateMutation = useMutation(trpc.introOffers.update.mutationOptions());
  const deleteMutation = useMutation(trpc.introOffers.delete.mutationOptions());

  function invalidate() {
    queryClient.invalidateQueries(trpc.introOffers.list.queryOptions());
  }

  function handleToggle(id: string, isActive: boolean) {
    updateMutation.mutate(
      { id, isActive: !isActive },
      {
        onSuccess: () => { toast.success(`Offer ${isActive ? "deactivated" : "activated"}`); invalidate(); },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => { toast.success("Offer deleted"); invalidate(); },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  const columns = React.useMemo(() => buildColumns(handleToggle, handleDelete), []);

  const COLUMN_IDS = React.useMemo(
    () => columns.map((col, i) => (col.id ?? `col-${i}`) as string),
    [columns],
  );

  React.useEffect(() => {
    setColumnOrder(COLUMN_IDS);
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(COLUMN_ORDER_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setColumnOrder(parsed);
    } catch {}
  }, []);

  const persistColumnOrder = React.useCallback((order: string[]) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(order));
  }, []);

  const handleColumnOrderChange = React.useCallback(
    (order: ColumnOrderState) => {
      setColumnOrder(order);
      persistColumnOrder(order);
    },
    [persistColumnOrder],
  );

  const filtered = React.useMemo(() => {
    let result = [...offers];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((row) => row.name.toLowerCase().includes(q));
    }

    if (selectedTypes.length > 0) {
      result = result.filter((row) => selectedTypes.includes(row.offerType));
    }

    if (selectedActive.length > 0) {
      result = result.filter((row) =>
        selectedActive.includes(row.isActive ? "true" : "false"),
      );
    }

    const [col, dir] = sortValue.split(".");
    result.sort((a, b) => {
      let cmp = 0;
      if (col === "name") cmp = a.name.localeCompare(b.name);
      else if (col === "price") cmp = Number(a.price) - Number(b.price);
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return dir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [offers, search, selectedTypes, selectedActive, sortValue]);

  const columnOrderOrDefault = columnOrder.length > 0 ? columnOrder : COLUMN_IDS;

  return (
    <DataTable
      columns={columns}
      data={filtered}
      isLoading={isFetching}
      getRowId={(row) => row.id}
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={(updater) =>
        setColumnVisibility(typeof updater === "function" ? (updater as (s: VisibilityState) => VisibilityState)(columnVisibility) : updater)
      }
      columnOrder={columnOrderOrDefault}
      onColumnOrderChange={handleColumnOrderChange}
      initialColumnOrder={COLUMN_IDS}
      enableGlobalSearch={false}
      emptyState={
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-medium text-primary">No intro offers yet</p>
          <p className="text-xs text-primary/55 mt-1">Create your first offer to attract new members.</p>
        </div>
      }
      toolbar={{
        filters: (ctx) => (
          <IntroOffersToolbar
            search={search}
            onSearchChange={setSearch}
            selectedTypes={selectedTypes}
            selectedActive={selectedActive}
            sortValue={sortValue}
            onSortChange={setSortValue}
            table={ctx.table}
            columnVisibility={columnVisibility}
            columnOrder={columnOrderOrDefault}
            onColumnOrderChange={handleColumnOrderChange}
            initialColumnOrder={COLUMN_IDS}
            onApplyFilters={({ types, active }) => {
              setSelectedTypes(types);
              setSelectedActive(active);
            }}
          />
        ),
      }}
    />
  );
}
