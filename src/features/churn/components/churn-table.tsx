"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnOrderState,
  VisibilityState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { ChurnToolbar } from "./churn-toolbar";

type RouterOutput = inferRouterOutputs<AppRouter>;
type ChurnRow = RouterOutput["churn"]["getScores"][number];

const RISK_COLORS: Record<string, string> = {
  LOW: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  MEDIUM:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function formatFactor(
  key: string,
  value: unknown,
  lastInteractionAt: Date | null,
): string {
  const days = Number(value);
  switch (key) {
    case "inactiveDays":
    case "daysSinceLastVisit":
      return days > 0
        ? `Inactive ${days}d`
        : lastInteractionAt
          ? `Last visit ${format(new Date(lastInteractionAt), "MMM d")}`
          : "Never visited";
    case "streakBroken":
      return "Streak broken";
    case "noActiveMembership":
      return "No membership";
    case "lowUsageRate":
      return `Usage ${Math.round(Number(value) * 100)}%`;
    case "newMemberLowEngagement":
      return "Low engagement";
    case "missedClasses":
      return `${days} missed class${days !== 1 ? "es" : ""}`;
    case "lowRecentBookings":
      return `${days} recent booking${days !== 1 ? "s" : ""}`;
    default: {
      const label = key.replace(/([A-Z])/g, " $1").trim().toLowerCase();
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
  }
}

const DEFAULT_SORT = "score.desc";
const PRIMARY_COLUMN_ID = "name";
const COLUMN_ORDER_KEY = "churn-table.column-order";

const churnColumns: ColumnDef<ChurnRow>[] = [
  {
    id: "name",
    accessorFn: (row) => row.clientName ?? "",
    header: "Member",
    meta: { label: "Member" },
    enableHiding: false,
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs font-medium text-primary truncate max-w-[180px] block">
        {row.original.clientName ?? "Unknown member"}
      </span>
    ),
  },
  {
    id: "score",
    accessorFn: (row) => row.score,
    header: "Score",
    meta: { label: "Score" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-sm font-bold text-primary">
        {row.original.score}
      </span>
    ),
  },
  {
    id: "riskLevel",
    accessorFn: (row) => row.riskLevel,
    header: "Risk",
    meta: { label: "Risk" },
    enableSorting: true,
    cell: ({ row }) => (
      <Badge className={RISK_COLORS[row.original.riskLevel] ?? ""}>
        {row.original.riskLevel.charAt(0) +
          row.original.riskLevel.slice(1).toLowerCase()}
      </Badge>
    ),
  },
  {
    id: "factors",
    header: "Factors",
    meta: { label: "Factors" },
    cell: ({ row }) => {
      const factors = (row.original.factors ?? {}) as Record<string, unknown>;
      const entries = Object.entries(factors);
      if (entries.length === 0)
        return <span className="text-[11px] text-primary/40">—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {entries.map(([key, value]) => (
            <span
              key={key}
              className="text-[10px] bg-black/[0.03] dark:bg-white/[0.05] text-primary/60 px-2 py-0.5 rounded-full whitespace-nowrap"
            >
              {formatFactor(key, value, row.original.lastInteractionAt)}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    id: "calculatedAt",
    accessorFn: (row) => row.calculatedAt,
    header: "Calculated",
    meta: { label: "Calculated" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-[11px] text-primary/50 whitespace-nowrap">
        {format(new Date(row.original.calculatedAt), "MMM d, yyyy")}
      </span>
    ),
  },
];

const COLUMN_IDS = churnColumns.map(
  (col, i) => (col.id ?? `col-${i}`) as string,
);

export function ChurnTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [sortValue, setSortValue] = React.useState(DEFAULT_SORT);
  const [selectedRiskLevels, setSelectedRiskLevels] = React.useState<string[]>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(COLUMN_IDS);

  const { data: scores, isFetching } = useSuspenseQuery(
    trpc.churn.getScores.queryOptions({ limit: 100 }),
  );

  const calculateMutation = useMutation(
    trpc.churn.calculateForAll.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Churn scores recalculated");
      },
      onError: (err) => toast.error(err.message),
    }),
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
    let result = [...scores];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
        row.clientName?.toLowerCase().includes(q),
      );
    }

    if (selectedRiskLevels.length > 0) {
      result = result.filter((row) =>
        selectedRiskLevels.includes(row.riskLevel),
      );
    }

    const [col, dir] = sortValue.split(".");
    result.sort((a, b) => {
      let cmp = 0;
      if (col === "score") cmp = a.score - b.score;
      else if (col === "name")
        cmp = (a.clientName ?? "").localeCompare(b.clientName ?? "");
      else if (col === "calculatedAt")
        cmp =
          new Date(a.calculatedAt).getTime() -
          new Date(b.calculatedAt).getTime();
      return dir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [scores, search, selectedRiskLevels, sortValue]);

  return (
    <DataTable
      columns={churnColumns}
      data={filtered}
      isLoading={isFetching}
      getRowId={(row) => row.id}
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={(updater) =>
        setColumnVisibility(
          typeof updater === "function"
            ? (updater as (s: VisibilityState) => VisibilityState)(
                columnVisibility,
              )
            : updater,
        )
      }
      columnOrder={columnOrder}
      onColumnOrderChange={handleColumnOrderChange}
      initialColumnOrder={COLUMN_IDS}
      enableGlobalSearch={false}
      emptyState={
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-medium text-primary">No churn data yet</p>
          <p className="text-xs text-primary/55 mt-1 mb-4">
            Click &quot;recalculate&quot; to analyse member risk.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => calculateMutation.mutate()}
            disabled={calculateMutation.isPending}
          >
            <RefreshCw
              className={`size-3.5 mr-1.5 ${calculateMutation.isPending ? "animate-spin" : ""}`}
            />
            {calculateMutation.isPending ? "Calculating..." : "Recalculate"}
          </Button>
        </div>
      }
      toolbar={{
        filters: (ctx) => (
          <ChurnToolbar
            search={search}
            onSearchChange={setSearch}
            selectedRiskLevels={selectedRiskLevels}
            sortValue={sortValue}
            onSortChange={setSortValue}
            table={ctx.table}
            columnVisibility={columnVisibility}
            columnOrder={columnOrder}
            onColumnOrderChange={handleColumnOrderChange}
            initialColumnOrder={COLUMN_IDS}
            onApplyFilters={({ riskLevels }) =>
              setSelectedRiskLevels(riskLevels)
            }
          />
        ),
      }}
    />
  );
}
