"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";
import { StudioTableToolbar } from "@/features/studio/components/studio-table-toolbar";
import type { AppRouter } from "@/trpc/routers/_app";

import {
  DashboardDatePicker,
  StatCard,
  ChartRevenue,
  ChartRevenueCategory,
  ChartRevenueWeekday,
} from "@/features/dashboard/components";
import {
  addDisplayLabels,
  formatDashboardLabel,
} from "@/features/dashboard/helpers";
import { CATEGORY_LABELS } from "@/features/dashboard/constants";
import { useDashboardComparison } from "@/stores/dashboard-comparison";
import {
  formatRangeDurationLabel,
  getComparisonRange,
} from "@/features/dashboard/comparison-utils";

type RouterOutput = inferRouterOutputs<AppRouter>;
type Payment = RouterOutput["revenue"]["transactions"]["payments"][number];

const TYPE_BADGE_STYLES: Record<string, string> = {
  MEMBERSHIP:
    "text-indigo-600 bg-indigo-50 ring-indigo-400 dark:ring-indigo-800",
  CLASS_PACK: "text-amber-600 bg-amber-50 ring-amber-400 dark:ring-amber-800",
  DROP_IN:
    "text-emerald-600 bg-emerald-50 ring-emerald-400 dark:ring-emerald-800",
  GIFT_CARD: "text-pink-600 bg-pink-50 ring-pink-400 dark:ring-pink-800",
  POS: "text-violet-600 bg-violet-50 ring-violet-400 dark:ring-violet-800",
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  SUCCEEDED:
    "text-emerald-600 bg-emerald-50 ring-emerald-400 dark:ring-emerald-800",
  PENDING: "text-amber-600 bg-amber-50 ring-amber-400 dark:ring-amber-800",
  FAILED: "text-rose-600 bg-rose-50 ring-rose-400 dark:ring-rose-800",
  REFUNDED: "text-blue-600 bg-blue-50 ring-blue-400 dark:ring-blue-800",
  CANCELLED: "text-primary/40 bg-primary/[0.03] border-primary/10",
};

const PRIMARY_COLUMN_ID = "date";
const COLUMN_ORDER_KEY = "revenue-table.column-order";

function amountToNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatSignedCurrency(amount: number, currency = "GBP"): string {
  const formatted = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(Math.abs(amount));
  return amount < 0 ? `-${formatted}` : formatted;
}

function defaultStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function defaultEnd() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatStatComparisonDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatStatComparisonRange(range: { start: Date; end: Date }): string {
  return `${formatStatComparisonDate(range.start)} - ${formatStatComparisonDate(range.end)}`;
}

function buildColumns(): ColumnDef<Payment>[] {
  return [
    {
      id: "date",
      accessorFn: (row) => new Date(row.createdAt).getTime(),
      header: "Date",
      meta: { label: "Date" },
      enableHiding: false,
      cell: ({ row }) => (
        <span className="text-xs text-primary/60">
          {format(new Date(row.original.createdAt), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      id: "memberName",
      accessorFn: (row) => row.client?.name ?? "",
      header: "Name",
      meta: { label: "Name" },
      cell: ({ row }) => (
        <p className="text-xs font-medium text-primary">
          {row.original.client?.name ?? "—"}
        </p>
      ),
    },
    {
      id: "memberEmail",
      accessorFn: (row) => row.client?.email ?? "",
      header: "Email",
      meta: { label: "Email" },
      cell: ({ row }) => (
        <span className="text-xs text-primary/55">
          {row.original.client?.email ?? "—"}
        </span>
      ),
    },
    {
      id: "memberPhone",
      accessorFn: (row) => row.client?.phone ?? "",
      header: "Phone",
      meta: { label: "Phone" },
      cell: ({ row }) => (
        <span className="text-xs text-primary/55">
          {row.original.client?.phone ?? "—"}
        </span>
      ),
    },
    {
      id: "type",
      accessorKey: "type",
      header: "Type",
      meta: { label: "Type" },
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn(
            "text-[11px]",
            TYPE_BADGE_STYLES[row.original.type] ??
              "text-primary/50 bg-primary/[0.03] border-primary/10",
          )}
        >
          {row.original.type === "POS"
            ? "POS"
            : row.original.type.charAt(0) +
              row.original.type.slice(1).toLowerCase().replaceAll("_", " ")}
        </Badge>
      ),
    },
    {
      id: "plan",
      accessorFn: (row) => row.membership?.membershipPlan?.name ?? "",
      header: "Plan",
      meta: { label: "Plan" },
      cell: ({ row }) => (
        <span className="text-xs text-primary/50">
          {row.original.membership?.membershipPlan?.name ?? "—"}
        </span>
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      meta: { label: "Status" },
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn(
            "text-[11px]",
            STATUS_BADGE_STYLES[row.original.status] ??
              "text-primary/40 bg-primary/3 border-primary/10",
          )}
        >
          {row.original.status.charAt(0) +
            row.original.status.slice(1).toLowerCase()}
        </Badge>
      ),
    },
    {
      id: "amount",
      accessorFn: (row) => amountToNumber(row.amount),
      header: "Amount",
      meta: { label: "Amount" },
      cell: ({ row }) => {
        const amount = amountToNumber(row.original.amount);
        return (
          <span
            className={cn(
              "text-xs font-semibold",
              amount < 0
                ? "text-rose-500"
                : amount > 0
                  ? "text-emerald-500"
                  : "text-primary/50",
            )}
          >
            {formatSignedCurrency(amount, row.original.currency ?? "GBP")}
          </span>
        );
      },
    },
  ];
}

export default function RevenuePage() {
  const trpc = useTRPC();
  const resetComparisons = useDashboardComparison((s) => s.reset);
  const comparisons = useDashboardComparison((s) => s.comparisons);
  const [activeTab, setActiveTab] = useState("overview");

  const [rangeStart, setRangeStart] = useState(defaultStart);
  const [rangeEnd, setRangeEnd] = useState(defaultEnd);

  const dashboardRange = useMemo(
    () => ({ start: rangeStart, end: rangeEnd }),
    [rangeStart, rangeEnd],
  );

  const rangeDays = useMemo(
    () =>
      Math.max(
        1,
        Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000),
      ),
    [rangeStart, rangeEnd],
  );

  const rangeInput = useMemo(
    () => ({ start: rangeStart, end: rangeEnd, days: rangeDays }),
    [rangeStart, rangeEnd, rangeDays],
  );

  const statComparisonLabel = useMemo(() => {
    const previousRange = getComparisonRange("previous", dashboardRange);
    if (!previousRange) return undefined;

    return `Compared with previous ${formatRangeDurationLabel(dashboardRange)} (${formatStatComparisonRange(previousRange)})`;
  }, [dashboardRange]);

  const handleRangeChange = useCallback(
    (start: Date, end: Date) => {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      setRangeStart(start);
      setRangeEnd(end);
      resetComparisons();
    },
    [resetComparisons],
  );

  // Transactions state
  const [txSearch, setTxSearch] = useState("");
  const [txSort, setTxSort] = useState("date.desc");
  const [txTypeFilter, setTxTypeFilter] = useState<string[]>([]);
  const [txStatusFilter, setTxStatusFilter] = useState<string[]>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);

  // Data queries
  const { data: dataRange } = useQuery(
    trpc.studioDashboard.dataRange.queryOptions(),
  );

  const { data: overview, isFetching: overviewFetching } = useQuery(
    trpc.revenue.overview.queryOptions(rangeInput),
  );

  const { data: revenueOverTime, isFetching: revenueFetching } = useQuery(
    trpc.studioDashboard.revenueOverTime.queryOptions(rangeInput),
  );
  const { data: revenueByCategory, isFetching: revenueCategoryFetching } =
    useQuery(trpc.studioDashboard.revenueByCategory.queryOptions(rangeInput));
  const { data: revenueByWeekday, isFetching: revenueWeekdayFetching } =
    useQuery(trpc.studioDashboard.revenueByWeekday.queryOptions(rangeInput));
  const revenueCompareRange = useMemo(
    () =>
      getComparisonRange(
        comparisons["chart-revenue"] ?? "none",
        dashboardRange,
      ),
    [comparisons, dashboardRange],
  );
  const revCatCompareRange = useMemo(
    () =>
      getComparisonRange(
        comparisons["chart-revenue-category"] ?? "none",
        dashboardRange,
      ),
    [comparisons, dashboardRange],
  );
  const revWeekdayCompareRange = useMemo(
    () =>
      getComparisonRange(
        comparisons["chart-revenue-weekday"] ?? "none",
        dashboardRange,
      ),
    [comparisons, dashboardRange],
  );

  const revenueCompareInput = useMemo(
    () =>
      revenueCompareRange
        ? {
            start: revenueCompareRange.start,
            end: revenueCompareRange.end,
            days: rangeDays,
          }
        : null,
    [revenueCompareRange, rangeDays],
  );
  const revCatCompareInput = useMemo(
    () =>
      revCatCompareRange
        ? {
            start: revCatCompareRange.start,
            end: revCatCompareRange.end,
            days: rangeDays,
          }
        : null,
    [revCatCompareRange, rangeDays],
  );
  const revWeekdayCompareInput = useMemo(
    () =>
      revWeekdayCompareRange
        ? {
            start: revWeekdayCompareRange.start,
            end: revWeekdayCompareRange.end,
            days: rangeDays,
          }
        : null,
    [revWeekdayCompareRange, rangeDays],
  );

  const { data: revenueCompare, isFetching: revenueCompareFetching } = useQuery(
    {
      ...trpc.studioDashboard.revenueOverTime.queryOptions(
        revenueCompareInput ?? undefined,
      ),
      enabled: !!revenueCompareInput,
    },
  );
  const { data: revCatCompare, isFetching: revCatCompareFetching } = useQuery({
    ...trpc.studioDashboard.revenueByCategory.queryOptions(
      revCatCompareInput ?? undefined,
    ),
    enabled: !!revCatCompareInput,
  });
  const { data: revWeekdayCompare, isFetching: revWeekdayCompareFetching } =
    useQuery({
      ...trpc.studioDashboard.revenueByWeekday.queryOptions(
        revWeekdayCompareInput ?? undefined,
      ),
      enabled: !!revWeekdayCompareInput,
    });

  const { data: txData } = useQuery(
    trpc.revenue.transactions.queryOptions({ limit: 100, ...rangeInput }),
  );

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "transactions", label: "Transactions" },
  ];

  const columns = buildColumns();
  const COLUMN_IDS = columns.map((c, i) => c.id ?? `col-${i}`);

  const filteredTransactions = (() => {
    let result = txData?.payments ?? [];
    if (txTypeFilter.length > 0)
      result = result.filter((p) => txTypeFilter.includes(p.type));
    if (txStatusFilter.length > 0)
      result = result.filter((p) => txStatusFilter.includes(p.status));
    if (txSearch.trim()) {
      const q = txSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.client?.name?.toLowerCase().includes(q) ||
          p.client?.email?.toLowerCase().includes(q) ||
          p.client?.phone?.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q),
      );
    }
    const [col, dir] = txSort.split(".");
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (col === "date")
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (col === "amount") {
        cmp = amountToNumber(a.amount) - amountToNumber(b.amount);
      }
      return dir === "desc" ? -cmp : cmp;
    });
    return result;
  })();

  const columnOrderFinal = columnOrder.length > 0 ? columnOrder : COLUMN_IDS;

  const currency = overview?.currency ?? "GBP";
  const fmtCurrency = (n: number) => formatSignedCurrency(n, currency);

  const revenueData = revenueOverTime ? addDisplayLabels(revenueOverTime) : [];
  const categoryData = (revenueByCategory ?? []).map((d) => ({
    ...d,
    label: formatDashboardLabel(CATEGORY_LABELS[d.category] ?? d.category),
  }));
  const transactionSpark = overview?.dailyTransactions.map((item) => ({
    v: item.count,
  }));
  const totalRevenueSpark = overview?.dailyRevenue.map((item) => ({
    v: item.amount,
  }));
  const netRevenueSpark = overview?.dailyNetRevenue.map((item) => ({
    v: item.amount,
  }));
  const arpmSpark = overview?.dailyArpm.map((item) => ({
    v: item.amount,
  }));

  const isStatsLoading = overviewFetching;
  const isRevenueLoading =
    revenueFetching || (!!revenueCompareInput && revenueCompareFetching);
  const isCategoryLoading =
    revenueCategoryFetching || (!!revCatCompareInput && revCatCompareFetching);
  const isWeekdayLoading =
    revenueWeekdayFetching ||
    (!!revWeekdayCompareInput && revWeekdayCompareFetching);

  const statCards = [
    {
      label: "Total revenue",
      value: overview ? fmtCurrency(overview.totalRevenue) : "—",
      change: overview?.revenueChange,
      spark: totalRevenueSpark,
      color: "#f59e0b",
    },
    {
      label: "Net revenue",
      value: overview ? fmtCurrency(overview.netRevenue) : "—",
      change: overview?.netRevenueChange,
      spark: netRevenueSpark,
      color: "#10b981",
    },
    {
      label: "Avg. per member",
      value: overview ? fmtCurrency(overview.arpm) : "—",
      change: overview?.arpmChange,
      spark: arpmSpark,
      color: "#8b5cf6",
    },
    {
      label: "Transactions",
      value: overview ? overview.transactionCount.toLocaleString() : "—",
      change: overview?.transactionChange,
      spark: transactionSpark,
      color: "#3b82f6",
    },
  ];

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-4 p-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Revenue</h1>
          <p className="text-xs text-primary/70">
            Track your studio&apos;s financial performance.
          </p>
        </div>
        <DashboardDatePicker
          start={rangeStart}
          end={rangeEnd}
          onRangeChange={handleRangeChange}
          earliestDate={
            dataRange?.earliest ? new Date(dataRange.earliest) : null
          }
        />
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <PageTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="px-6"
      />

      <Separator className="bg-black/5 dark:bg-white/5" />

      {activeTab === "overview" && (
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {statCards.map((stat) => (
              <StatCard
                key={stat.label}
                stat={stat}
                isLoading={isStatsLoading}
                comparisonLabel={statComparisonLabel}
              />
            ))}
          </div>

          <div className="grid auto-rows-[288px] grid-cols-1 gap-3 md:grid-cols-2">
            <div className="col-span-1 md:col-span-2 h-72">
              <ChartRevenue
                data={revenueData}
                comparisonData={revenueCompareRange ? revenueCompare : null}
                range={dashboardRange}
                isLoading={isRevenueLoading}
              />
            </div>
            <div className="h-72">
              <ChartRevenueCategory
                data={categoryData}
                comparisonData={revCatCompareRange ? revCatCompare : null}
                range={dashboardRange}
                isLoading={isCategoryLoading}
              />
            </div>
            <div className="h-72">
              <ChartRevenueWeekday
                data={revenueByWeekday ?? []}
                comparisonData={
                  revWeekdayCompareRange ? revWeekdayCompare : null
                }
                range={dashboardRange}
                isLoading={isWeekdayLoading}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "transactions" && (
        <DataTable
          columns={columns}
          data={filteredTransactions}
          isLoading={!txData}
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
          columnOrder={columnOrderFinal}
          onColumnOrderChange={(order) => {
            setColumnOrder(order);
            try {
              window.localStorage.setItem(
                COLUMN_ORDER_KEY,
                JSON.stringify(order),
              );
            } catch {}
          }}
          initialColumnOrder={COLUMN_IDS}
          enableGlobalSearch={false}
          toolbar={{
            filters: (ctx) => (
              <StudioTableToolbar
                search={txSearch}
                onSearchChange={setTxSearch}
                searchPlaceholder="Search transactions..."
                filterGroups={[
                  {
                    label: "Type",
                    options: [
                      { value: "MEMBERSHIP", label: "Membership" },
                      { value: "CLASS_PACK", label: "Class pack" },
                      { value: "DROP_IN", label: "Drop-in" },
                      { value: "GIFT_CARD", label: "Gift card" },
                      { value: "POS", label: "POS" },
                    ],
                    selectedValues: txTypeFilter,
                    onChange: setTxTypeFilter,
                  },
                  {
                    label: "Status",
                    options: [
                      { value: "SUCCEEDED", label: "Succeeded" },
                      { value: "PENDING", label: "Pending" },
                      { value: "FAILED", label: "Failed" },
                      { value: "REFUNDED", label: "Refunded" },
                      { value: "CANCELLED", label: "Cancelled" },
                    ],
                    selectedValues: txStatusFilter,
                    onChange: setTxStatusFilter,
                  },
                ]}
                sortOptions={[
                  { value: "date.desc", label: "Newest first" },
                  { value: "date.asc", label: "Oldest first" },
                  { value: "amount.desc", label: "Amount high–low" },
                  { value: "amount.asc", label: "Amount low–high" },
                ]}
                sortValue={txSort}
                onSortChange={setTxSort}
                table={ctx.table}
                columnVisibility={columnVisibility}
                columnOrder={columnOrderFinal}
                onColumnOrderChange={(order) => {
                  setColumnOrder(order);
                  try {
                    window.localStorage.setItem(
                      COLUMN_ORDER_KEY,
                      JSON.stringify(order),
                    );
                  } catch {}
                }}
                initialColumnOrder={COLUMN_IDS}
                primaryColumnId={PRIMARY_COLUMN_ID}
              />
            ),
          }}
          emptyState={
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CreditCard className="mb-3 size-8 text-primary/20" />
              <p className="text-sm text-primary/50">No transactions found.</p>
            </div>
          }
        />
      )}
    </div>
  );
}
