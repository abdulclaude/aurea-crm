"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import type { ColumnDef, ColumnOrderState, VisibilityState } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { Copy } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { ReferralsToolbar } from "./referrals-toolbar";

type RouterOutput = inferRouterOutputs<AppRouter>;
type ReferralRow = RouterOutput["referrals"]["listReferrals"][number];

const STATUS_COLORS: Record<string, string> = {
  CONVERTED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  EXPIRED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const DEFAULT_SORT = "expiresAt.desc";
const PRIMARY_COLUMN_ID = "refereeEmail";
const COLUMN_ORDER_KEY = "referrals-table.column-order";

const referralColumns: ColumnDef<ReferralRow>[] = [
  {
    id: "refereeEmail",
    accessorFn: (row) => row.refereeEmail,
    header: "Referee",
    meta: { label: "Referee" },
    enableHiding: false,
    enableSorting: true,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="text-xs font-medium text-primary truncate max-w-[200px]">
          {row.original.refereeClient?.name ?? row.original.refereeEmail}
        </p>
        {row.original.refereeClient?.name && (
          <p className="text-[11px] text-primary/50 truncate max-w-[200px]">{row.original.refereeEmail}</p>
        )}
      </div>
    ),
  },
  {
    id: "referrerClient",
    accessorFn: (row) => row.referrerClient?.name ?? "",
    header: "Referrer",
    meta: { label: "Referrer" },
    enableSorting: true,
    cell: ({ row }) => (
      <div className="min-w-0">
        {row.original.referrerClient ? (
          <>
            <p className="text-xs font-medium text-primary truncate max-w-[160px]">{row.original.referrerClient.name}</p>
            <p className="text-[11px] text-primary/50 truncate max-w-[160px]">{row.original.referrerClient.email}</p>
          </>
        ) : (
          <span className="text-xs text-primary/40">—</span>
        )}
      </div>
    ),
  },
  {
    id: "code",
    accessorFn: (row) => row.code,
    header: "Code",
    meta: { label: "Code" },
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-primary/70">{row.original.code}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => {
            navigator.clipboard.writeText(row.original.code);
            toast.success("Code copied");
          }}
        >
          <Copy className="size-3" />
        </Button>
      </div>
    ),
  },
  {
    id: "status",
    accessorFn: (row) => row.status,
    header: "Status",
    meta: { label: "Status" },
    enableSorting: true,
    cell: ({ row }) => (
      <Badge className={STATUS_COLORS[row.original.status] ?? "bg-primary/5 text-primary/60"} variant="secondary">
        {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1).toLowerCase().replace(/_/g, " ")}
      </Badge>
    ),
  },
  {
    id: "expiresAt",
    accessorFn: (row) => row.expiresAt,
    header: "Expires",
    meta: { label: "Expires" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-[11px] text-primary/50 whitespace-nowrap">
        {format(new Date(row.original.expiresAt), "MMM d, yyyy")}
      </span>
    ),
  },
];

const COLUMN_IDS = referralColumns.map((col, i) => (col.id ?? `col-${i}`) as string);

export function ReferralsTable() {
  const trpc = useTRPC();

  const [search, setSearch] = React.useState("");
  const [sortValue, setSortValue] = React.useState(DEFAULT_SORT);
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>(COLUMN_IDS);

  const { data: referrals, isFetching } = useSuspenseQuery(
    trpc.referrals.listReferrals.queryOptions({}),
  );

  React.useEffect(() => {
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
    let result = [...referrals];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
        row.refereeEmail.toLowerCase().includes(q) ||
        row.referrerClient?.name?.toLowerCase().includes(q) ||
        row.referrerClient?.email?.toLowerCase().includes(q) ||
        row.refereeClient?.name?.toLowerCase().includes(q),
      );
    }

    if (selectedStatuses.length > 0) {
      result = result.filter((row) => selectedStatuses.includes(row.status));
    }

    const [col, dir] = sortValue.split(".");
    result.sort((a, b) => {
      let cmp = 0;
      if (col === "expiresAt") cmp = new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
      else if (col === "email") cmp = a.refereeEmail.localeCompare(b.refereeEmail);
      return dir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [referrals, search, selectedStatuses, sortValue]);

  return (
    <DataTable
      columns={referralColumns}
      data={filtered}
      isLoading={isFetching}
      getRowId={(row) => row.id}
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={(updater) =>
        setColumnVisibility(typeof updater === "function" ? (updater as (s: VisibilityState) => VisibilityState)(columnVisibility) : updater)
      }
      columnOrder={columnOrder}
      onColumnOrderChange={handleColumnOrderChange}
      initialColumnOrder={COLUMN_IDS}
      enableGlobalSearch={false}
      emptyState={
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-medium text-primary">No referrals yet</p>
          <p className="text-xs text-primary/55 mt-1">Create a referral to get started.</p>
        </div>
      }
      toolbar={{
        filters: (ctx) => (
          <ReferralsToolbar
            search={search}
            onSearchChange={setSearch}
            selectedStatuses={selectedStatuses}
            sortValue={sortValue}
            onSortChange={setSortValue}
            table={ctx.table}
            columnVisibility={columnVisibility}
            columnOrder={columnOrder}
            onColumnOrderChange={handleColumnOrderChange}
            initialColumnOrder={COLUMN_IDS}
            onApplyFilters={({ statuses }) => setSelectedStatuses(statuses)}
          />
        ),
      }}
    />
  );
}
