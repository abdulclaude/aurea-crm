"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { DemoDataControl } from "@/features/demo-data/components/demo-data-control";
import { useIsInstructor } from "@/features/instructors/hooks/use-is-instructor";
import { InstructorDashboard } from "@/features/instructors/components/instructor-dashboard";
import {
  useDashboardLayout,
  ALL_STAT_WIDGET_IDS,
  STAT_WIDGET_LABELS,
  ALL_CHART_WIDGET_IDS,
  CHART_WIDGET_LABELS,
  DEFAULT_CHART_SPANS,
  ALL_BOTTOM_WIDGET_IDS,
  BOTTOM_WIDGET_LABELS,
  type StatWidgetId,
  type ChartWidgetId,
  type BottomWidgetId,
} from "@/stores/dashboard-layout";
import { useDashboardComparison } from "@/stores/dashboard-comparison";
import {
  formatRangeDurationLabel,
  getComparisonRange,
} from "@/features/dashboard/comparison-utils";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";

import {
  sanitizeSpan,
  addDisplayLabels,
  formatDashboardLabel,
  formatDashboardMoney,
} from "@/features/dashboard/helpers";
import { CATEGORY_LABELS, MAX_COLS } from "@/features/dashboard/constants";
import {
  DashboardHeader,
  DashboardDatePicker,
  StatCard,
  SortableStatTile,
  SortableChartTile,
  SortableBottomTile,
  ChartVisits,
  ChartMemberships,
  ChartRevenue,
  ChartRevenueCategory,
  ChartRevenueWeekday,
  ChartPlanBreakdown,
  TodaySchedule,
  ClassOccupancy,
  RecentActivity,
  AtRiskMembers,
  WaitlistDemand,
  ConversionSankey,
  ClassTypeUtilization,
  InstructorUtilization,
  AutomationAttribution,
  CampaignPerformance,
} from "@/features/dashboard/components";

const { useSession } = authClient;

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

function fmtNum(n: number): string {
  return n.toLocaleString();
}

function fmtSigned(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toLocaleString()}`;
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

export default function DashboardPage() {
  const { isInstructor } = useIsInstructor();

  if (isInstructor) {
    return <InstructorDashboard />;
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const trpc = useTRPC();
  const { data: session } = useSession();
  const layout = useDashboardLayout();
  const resetComparisons = useDashboardComparison((s) => s.reset);
  const comparisons = useDashboardComparison((s) => s.comparisons);

  const [rangeStart, setRangeStart] = useState(defaultStart);
  const [rangeEnd, setRangeEnd] = useState(defaultEnd);

  const dashboardRange = useMemo(
    () => ({ start: rangeStart, end: rangeEnd }),
    [rangeStart, rangeEnd],
  );

  const rangeDays = useMemo(
    () => Math.max(1, Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000)),
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

  // ─── Comparison ranges ───────────────────────────────────────────────────────

  const visitsCompareRange = useMemo(
    () => getComparisonRange(comparisons["chart-visits"] ?? "none", dashboardRange),
    [comparisons, dashboardRange],
  );
  const membershipsCompareRange = useMemo(
    () => getComparisonRange(comparisons["chart-memberships"] ?? "none", dashboardRange),
    [comparisons, dashboardRange],
  );
  const revenueCompareRange = useMemo(
    () => getComparisonRange(comparisons["chart-revenue"] ?? "none", dashboardRange),
    [comparisons, dashboardRange],
  );
  const revCatCompareRange = useMemo(
    () => getComparisonRange(comparisons["chart-revenue-category"] ?? "none", dashboardRange),
    [comparisons, dashboardRange],
  );
  const revWeekdayCompareRange = useMemo(
    () => getComparisonRange(comparisons["chart-revenue-weekday"] ?? "none", dashboardRange),
    [comparisons, dashboardRange],
  );
  const conversionCompareRange = useMemo(
    () => getComparisonRange(comparisons["chart-conversion-sankey"] ?? "none", dashboardRange),
    [comparisons, dashboardRange],
  );

  // ─── Data queries ────────────────────────────────────────────────────────────

  const { data: dataRange } = useQuery(
    trpc.studioDashboard.dataRange.queryOptions(),
  );
  const { data: dashboardLocale } = useQuery(
    trpc.studioDashboard.locale.queryOptions(),
  );
  const currency = dashboardLocale?.currency;

  const { data: activeDates } = useQuery(
    trpc.studioDashboard.activeDates.queryOptions(),
  );

  const { data: stats, isPending: statsPending } = useQuery(
    trpc.studioDashboard.summaryStats.queryOptions(rangeInput),
  );

  const { data: visits, isPending: visitsPending } = useQuery(
    trpc.studioDashboard.visitsOverTime.queryOptions(rangeInput),
  );
  const { data: membershipsOverTime, isPending: membershipsPending } = useQuery(
    trpc.studioDashboard.membershipsOverTime.queryOptions(rangeInput),
  );
  const { data: revenueOverTime, isPending: revenuePending } = useQuery(
    trpc.studioDashboard.revenueOverTime.queryOptions(rangeInput),
  );
  const { data: revenueByCategory, isPending: revenueCategoryPending } = useQuery(
    trpc.studioDashboard.revenueByCategory.queryOptions(rangeInput),
  );
  const { data: revenueByWeekday, isPending: revenueWeekdayPending } = useQuery(
    trpc.studioDashboard.revenueByWeekday.queryOptions(rangeInput),
  );

  // ─── Comparison data queries ─────────────────────────────────────────────────

  const visitsCompareInput = useMemo(
    () => visitsCompareRange ? { start: visitsCompareRange.start, end: visitsCompareRange.end, days: rangeDays } : null,
    [visitsCompareRange, rangeDays],
  );
  const membershipsCompareInput = useMemo(
    () => membershipsCompareRange ? { start: membershipsCompareRange.start, end: membershipsCompareRange.end, days: rangeDays } : null,
    [membershipsCompareRange, rangeDays],
  );
  const revenueCompareInput = useMemo(
    () => revenueCompareRange ? { start: revenueCompareRange.start, end: revenueCompareRange.end, days: rangeDays } : null,
    [revenueCompareRange, rangeDays],
  );

  const { data: visitsCompare, isPending: visitsComparePending } = useQuery({
    ...trpc.studioDashboard.visitsOverTime.queryOptions(visitsCompareInput ?? undefined),
    enabled: !!visitsCompareInput,
  });
  const { data: membershipsCompare, isPending: membershipsComparePending } = useQuery({
    ...trpc.studioDashboard.membershipsOverTime.queryOptions(membershipsCompareInput ?? undefined),
    enabled: !!membershipsCompareInput,
  });
  const { data: revenueCompare, isPending: revenueComparePending } = useQuery({
    ...trpc.studioDashboard.revenueOverTime.queryOptions(revenueCompareInput ?? undefined),
    enabled: !!revenueCompareInput,
  });

  const revCatCompareInput = useMemo(
    () => revCatCompareRange ? { start: revCatCompareRange.start, end: revCatCompareRange.end, days: rangeDays } : null,
    [revCatCompareRange, rangeDays],
  );
  const revWeekdayCompareInput = useMemo(
    () => revWeekdayCompareRange ? { start: revWeekdayCompareRange.start, end: revWeekdayCompareRange.end, days: rangeDays } : null,
    [revWeekdayCompareRange, rangeDays],
  );
  const conversionCompareInput = useMemo(
    () => conversionCompareRange ? { start: conversionCompareRange.start, end: conversionCompareRange.end, days: rangeDays } : null,
    [conversionCompareRange, rangeDays],
  );

  const { data: revCatCompare, isPending: revCatComparePending } = useQuery({
    ...trpc.studioDashboard.revenueByCategory.queryOptions(revCatCompareInput ?? undefined),
    enabled: !!revCatCompareInput,
  });
  const { data: revWeekdayCompare, isPending: revWeekdayComparePending } = useQuery({
    ...trpc.studioDashboard.revenueByWeekday.queryOptions(revWeekdayCompareInput ?? undefined),
    enabled: !!revWeekdayCompareInput,
  });
  const { data: conversionCompare, isPending: conversionComparePending } = useQuery({
    ...trpc.studioDashboard.conversionOverview.queryOptions(conversionCompareInput ?? undefined),
    enabled: !!conversionCompareInput,
  });

  // ─── Other queries ──────────────────────────────────────────────────────────

  const { data: occupancy } = useQuery(
    trpc.studioDashboard.upcomingOccupancy.queryOptions(),
  );
  const { data: activity } = useQuery(
    trpc.studioDashboard.recentActivity.queryOptions(),
  );
  const { data: todaySchedule } = useQuery(
    trpc.studioDashboard.todaySchedule.queryOptions(),
  );
  const { data: totalRevenue, isPending: totalRevenuePending } = useQuery(
    trpc.studioDashboard.totalRevenue.queryOptions(rangeInput),
  );
  const { data: sparklines, isPending: sparklinesPending } = useQuery(
    trpc.studioDashboard.statSparklines.queryOptions(rangeInput),
  );
  const { data: fitnessKpis, isPending: fitnessKpisPending } = useQuery(
    trpc.studioDashboard.fitnessKpis.queryOptions(rangeInput),
  );
  const { data: atRiskData } = useQuery(
    trpc.studioDashboard.atRiskMembers.queryOptions(),
  );
  const { data: waitlistData } = useQuery(
    trpc.studioDashboard.waitlistSummary.queryOptions(),
  );
  const { data: newMembersData, isPending: newMembersPending } = useQuery(
    trpc.studioDashboard.newMembersCount.queryOptions(rangeInput),
  );
  const { data: expiringData, isPending: expiringPending } = useQuery(
    trpc.studioDashboard.expiringMembershipsCount.queryOptions(rangeInput),
  );
  const { data: conversionOverview, isPending: conversionPending } = useQuery(
    trpc.studioDashboard.conversionOverview.queryOptions(rangeInput),
  );
  const { data: planGainLoss, isPending: planGainLossPending } = useQuery(
    trpc.studioDashboard.planGainLoss.queryOptions(rangeInput),
  );
  const { data: classTypeUtilization, isPending: classTypePending } = useQuery(
    trpc.studioDashboard.classTypeUtilization.queryOptions(rangeInput),
  );
  const { data: instructorUtilization } = useQuery(
    trpc.studioDashboard.instructorUtilization.queryOptions(rangeInput),
  );
  const { data: automationAttribution } = useQuery(
    trpc.studioDashboard.automationAttribution.queryOptions(rangeInput),
  );
  const { data: campaignPerformance } = useQuery(
    trpc.studioDashboard.campaignPerformance.queryOptions(rangeInput),
  );

  // ─── Derived data ────────────────────────────────────────────────────────────

  const rangeLabel = useMemo(() => {
    if (rangeDays <= 31 && rangeStart.getDate() === 1) return "current month";
    return `last ${rangeDays} days`;
  }, [rangeDays, rangeStart]);

  const visitsData = visits ? addDisplayLabels(visits) : [];
  const membershipsData = membershipsOverTime
    ? addDisplayLabels(membershipsOverTime)
    : [];
  const revenueData = revenueOverTime ? addDisplayLabels(revenueOverTime) : [];
  const categoryData = (revenueByCategory ?? []).map((d) => ({
    ...d,
    label: formatDashboardLabel(CATEGORY_LABELS[d.category] ?? d.category),
  }));

  const { isEditing } = layout;

  // ─── DnD ─────────────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const [activeDragStat, setActiveDragStat] = useState<StatWidgetId | null>(
    null,
  );
  const [activeDragChart, setActiveDragChart] = useState<ChartWidgetId | null>(
    null,
  );
  const [activeDragBottom, setActiveDragBottom] =
    useState<BottomWidgetId | null>(null);

  const getChartSpan = (id: ChartWidgetId): number => {
    const raw = layout.chartSpans[id] ?? DEFAULT_CHART_SPANS[id] ?? 1;
    return Math.min(sanitizeSpan(raw), MAX_COLS);
  };

  const disabledCharts = ALL_CHART_WIDGET_IDS.filter(
    (id) => !layout.enabledCharts.includes(id),
  );
  const disabledStats = ALL_STAT_WIDGET_IDS.filter(
    (id) => !layout.enabledStats.includes(id),
  );
  const disabledBottom = ALL_BOTTOM_WIDGET_IDS.filter(
    (id) => !layout.enabledBottom.includes(id),
  );

  const chartLoading: Record<ChartWidgetId, boolean> = {
    "chart-visits": visitsPending || (!!visitsCompareInput && visitsComparePending),
    "chart-memberships":
      membershipsPending ||
      (!!membershipsCompareInput && membershipsComparePending),
    "chart-revenue":
      revenuePending || (!!revenueCompareInput && revenueComparePending),
    "chart-revenue-category":
      revenueCategoryPending || (!!revCatCompareInput && revCatComparePending),
    "chart-revenue-weekday":
      revenueWeekdayPending ||
      (!!revWeekdayCompareInput && revWeekdayComparePending),
    "chart-plan-breakdown": classTypePending,
    "chart-conversion-sankey":
      conversionPending ||
      (!!conversionCompareInput && conversionComparePending),
  };

  // ─── Double-click enters edit mode ───────────────────────────────────────────

  const handleDoubleClickEdit = () => {
    if (!isEditing) layout.startEditing();
  };

  // ─── Stats config ────────────────────────────────────────────────────────────

  const ALL_STATS_DATA: Record<
    StatWidgetId,
    {
      label: string;
      value: string | number;
      change?: number;
      spark?: { v: number }[];
      color: string;
    }
  > = {
    "stat-active-memberships": {
      label: "Active memberships",
      value: stats?.activeMemberships != null ? fmtNum(stats.activeMemberships) : "—",
      change: stats?.membershipsChange,
      spark: sparklines?.memberships,
      color: "#6366f1",
    },
    "stat-classes-today": {
      label: "Classes today",
      value: stats?.todayClasses != null ? fmtNum(stats.todayClasses) : "—",
      change: stats?.classesChange,
      spark: sparklines?.visits,
      color: "#3b82f6",
    },
    "stat-checkins-today": {
      label: "Check-ins today",
      value: stats?.todayCheckIns != null ? fmtNum(stats.todayCheckIns) : "—",
      change: stats?.checkInsChange,
      spark: sparklines?.visits,
      color: "#10b981",
    },
    "stat-visits-month": {
      label: `Visits (${rangeLabel})`,
      value: stats?.monthCheckIns != null ? fmtNum(stats.monthCheckIns) : "—",
      change: stats?.visitsChange,
      spark: sparklines?.visits,
      color: "#10b981",
    },
    "stat-total-sales": {
      label: `Total sales (${rangeLabel})`,
      value: totalRevenue ? formatDashboardMoney(totalRevenue.total, currency) : "—",
      change: totalRevenue?.change,
      spark: sparklines?.revenue,
      color: "#f59e0b",
    },
    "stat-arpm": {
      label: "Avg. revenue / member",
      value: fitnessKpis ? formatDashboardMoney(fitnessKpis.arpm, currency) : "—",
      change: fitnessKpis?.arpmChange,
      spark: sparklines?.revenue,
      color: "#8b5cf6",
    },
    "stat-no-show-rate": {
      label: "No-show rate",
      value: fitnessKpis ? `${fitnessKpis.noShowRate}%` : "—",
      change: fitnessKpis?.noShowChange ? -fitnessKpis.noShowChange : undefined,
      spark: undefined,
      color: "#ef4444",
    },
    "stat-class-utilization": {
      label: "Class utilization",
      value: fitnessKpis ? `${fitnessKpis.classUtilization}%` : "—",
      change: undefined,
      spark: undefined,
      color: "#06b6d4",
    },
    "stat-churn-rate": {
      label: "Churn rate",
      value: fitnessKpis ? `${fitnessKpis.churnRate}%` : "—",
      change: undefined,
      spark: undefined,
      color: "#f43f5e",
    },
    "stat-new-members": {
      label: `New members (${newMembersData?.label ?? rangeLabel})`,
      value: newMembersData?.count != null ? fmtNum(newMembersData.count) : "—",
      change: newMembersData?.change,
      spark: sparklines?.memberships,
      color: "#22c55e",
    },
    "stat-expiring-soon": {
      label: "Expiring soon",
      value: expiringData?.count != null ? fmtNum(expiringData.count) : "—",
      change: undefined,
      spark: undefined,
      color: "#f97316",
    },
    "stat-first-visit-rate": {
      label: "First visit rate",
      value: conversionOverview
        ? `${conversionOverview.metrics.firstVisitRate}%`
        : "—",
      change: undefined,
      spark: undefined,
      color: "#06b6d4",
    },
    "stat-intro-conversion": {
      label: "Intro conversion",
      value: conversionOverview
        ? `${conversionOverview.metrics.introToMembershipRate}%`
        : "—",
      change: undefined,
      spark: undefined,
      color: "#8b5cf6",
    },
    "stat-referral-conversion": {
      label: "Referral conversion",
      value: conversionOverview
        ? `${conversionOverview.metrics.referralConversionRate}%`
        : "—",
      change: undefined,
      spark: undefined,
      color: "#ec4899",
    },
    "stat-automation-conversions": {
      label: "Automation conversions",
      value: conversionOverview?.metrics.automationConversions != null ? fmtNum(conversionOverview.metrics.automationConversions) : "—",
      change: conversionOverview?.metrics.automationConversionsChange,
      spark: undefined,
      color: "#6366f1",
    },
    "stat-plan-net-growth": {
      label: "Plan net growth",
      value: planGainLoss ? fmtSigned(planGainLoss.net) : "—",
      change: planGainLoss?.change,
      spark: undefined,
      color: "#22c55e",
    },
  };

  const statLoading: Record<StatWidgetId, boolean> = {
    "stat-active-memberships": statsPending || sparklinesPending,
    "stat-classes-today": statsPending || sparklinesPending,
    "stat-checkins-today": statsPending || sparklinesPending,
    "stat-visits-month": statsPending || sparklinesPending,
    "stat-total-sales": totalRevenuePending || sparklinesPending,
    "stat-arpm": fitnessKpisPending || sparklinesPending,
    "stat-no-show-rate": fitnessKpisPending,
    "stat-class-utilization": fitnessKpisPending,
    "stat-churn-rate": fitnessKpisPending,
    "stat-new-members": newMembersPending || sparklinesPending,
    "stat-expiring-soon": expiringPending,
    "stat-first-visit-rate": conversionPending,
    "stat-intro-conversion": conversionPending,
    "stat-referral-conversion": conversionPending,
    "stat-automation-conversions": conversionPending,
    "stat-plan-net-growth": planGainLossPending,
  };

  // ─── Chart renderer ──────────────────────────────────────────────────────────

  const renderChart = (id: ChartWidgetId, forOverlay = false) => {
    const editing = isEditing || forOverlay;
    switch (id) {
      case "chart-visits":
        return (
          <ChartVisits
            data={visitsData}
            comparisonData={visitsCompareRange ? visitsCompare : null}
            range={dashboardRange}
            isEditing={editing}
            isLoading={chartLoading[id]}
          />
        );
      case "chart-memberships":
        return (
          <ChartMemberships
            data={membershipsData}
            comparisonData={membershipsCompareRange ? membershipsCompare : null}
            range={dashboardRange}
            isEditing={editing}
            isLoading={chartLoading[id]}
          />
        );
      case "chart-revenue":
        return (
          <ChartRevenue
            currency={currency}
            data={revenueData}
            comparisonData={revenueCompareRange ? revenueCompare : null}
            range={dashboardRange}
            isEditing={editing}
            isLoading={chartLoading[id]}
          />
        );
      case "chart-revenue-category":
        return (
          <ChartRevenueCategory
            currency={currency}
            data={categoryData}
            comparisonData={revCatCompareRange ? revCatCompare : null}
            range={dashboardRange}
            isEditing={editing}
            isLoading={chartLoading[id]}
          />
        );
      case "chart-revenue-weekday":
        return (
          <ChartRevenueWeekday
            currency={currency}
            data={revenueByWeekday ?? []}
            comparisonData={revWeekdayCompareRange ? revWeekdayCompare : null}
            range={dashboardRange}
            isEditing={editing}
            isLoading={chartLoading[id]}
          />
        );
      case "chart-plan-breakdown":
        return (
          <ChartPlanBreakdown
            data={(classTypeUtilization ?? []).map((item) => ({
              id: item.id,
              name: formatDashboardLabel(item.name),
              color: item.color,
              classes: item.classes,
            }))}
            isEditing={editing}
            isLoading={chartLoading[id]}
          />
        );
      case "chart-conversion-sankey":
        return (
          <ConversionSankey
            data={conversionOverview}
            comparisonData={conversionCompareRange && conversionCompare ? conversionCompare : null}
            range={dashboardRange}
            isEditing={editing}
            isLoading={chartLoading[id]}
          />
        );
      default:
        return null;
    }
  };

  // ─── Bottom renderer ─────────────────────────────────────────────────────────

  const renderBottom = (id: BottomWidgetId, editing = isEditing) => {
    switch (id) {
      case "bottom-schedule":
        return <TodaySchedule data={todaySchedule} isEditing={editing} />;
      case "bottom-occupancy":
        return <ClassOccupancy data={occupancy} isEditing={editing} />;
      case "bottom-activity":
        return <RecentActivity data={activity} isEditing={editing} />;
      case "bottom-at-risk":
        return <AtRiskMembers data={atRiskData} isEditing={editing} />;
      case "bottom-waitlist":
        return <WaitlistDemand data={waitlistData} isEditing={editing} />;
      case "bottom-class-type-utilization":
        return (
          <ClassTypeUtilization
            data={classTypeUtilization}
            isEditing={editing}
          />
        );
      case "bottom-instructor-utilization":
        return (
          <InstructorUtilization
            data={instructorUtilization}
            isEditing={editing}
          />
        );
      case "bottom-automation-attribution":
        return (
          <AutomationAttribution
            data={automationAttribution}
            isEditing={editing}
            currency={currency}
          />
        );
      case "bottom-campaign-performance":
        return (
          <CampaignPerformance data={campaignPerformance} isEditing={editing} />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="space-y-4 overflow-y-auto p-5"
      onDoubleClick={handleDoubleClickEdit}
    >
      {/* Header */}
      <DashboardHeader
        userName={session?.user?.name}
        userImage={session?.user?.image}
        isEditing={isEditing}
        demoDataControl={<DemoDataControl />}
        onToggleEdit={layout.toggleEditing}
        onReset={layout.resetAll}
        datePicker={
          <DashboardDatePicker
            start={rangeStart}
            end={rangeEnd}
            onRangeChange={handleRangeChange}
            earliestDate={dataRange?.earliest ? new Date(dataRange.earliest) : null}
            activeDates={activeDates}
          />
        }
      />

      {/* ─── Stats ──────────────────────────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(event: DragStartEvent) =>
          setActiveDragStat(event.active.id as StatWidgetId)
        }
        onDragEnd={(event: DragEndEvent) => {
          const { active, over } = event;
          if (over && active.id !== over.id) {
            layout.reorderStats(
              active.id as StatWidgetId,
              over.id as StatWidgetId,
            );
          }
          setActiveDragStat(null);
        }}
        onDragCancel={() => setActiveDragStat(null)}
      >
        <SortableContext
          items={layout.enabledStats}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {layout.enabledStats.map((id) => {
              const stat = ALL_STATS_DATA[id];
              if (!stat) return null;
              return (
                <SortableStatTile
                  key={id}
                  id={id}
                  isEditing={isEditing}
                  onRemove={() => layout.toggleStat(id)}
                >
                  <StatCard
                    stat={stat}
                    isEditing={isEditing}
                    isLoading={statLoading[id]}
                    comparisonLabel={statComparisonLabel}
                  />
                </SortableStatTile>
              );
            })}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null} zIndex={50}>
          {activeDragStat && ALL_STATS_DATA[activeDragStat] ? (
            <div className="rounded-xl opacity-90 shadow-xl">
              <StatCard
                stat={ALL_STATS_DATA[activeDragStat]}
                isEditing
                isLoading={statLoading[activeDragStat]}
                comparisonLabel={statComparisonLabel}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <AnimatePresence>
        {isEditing && disabledStats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {disabledStats.map((id) => (
                <div
                  key={id}
                  className="relative cursor-pointer opacity-45 transition-all duration-150 hover:opacity-90"
                  onClick={() => layout.toggleStat(id)}
                  title={`Add ${STAT_WIDGET_LABELS[id]}`}
                >
                  <StatCard
                    stat={ALL_STATS_DATA[id]}
                    isLoading={statLoading[id]}
                    comparisonLabel={statComparisonLabel}
                  />
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px]">
                    <span className="flex items-center gap-1.5 rounded-full border border-black/[0.07] bg-white px-3 py-1.5 text-[11px] font-medium text-black/70 shadow-sm">
                      <Plus className="size-3" />
                      {STAT_WIDGET_LABELS[id]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Charts ─────────────────────────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(event: DragStartEvent) =>
          setActiveDragChart(event.active.id as ChartWidgetId)
        }
        onDragEnd={(event: DragEndEvent) => {
          const { active, over } = event;
          if (over && active.id !== over.id) {
            layout.reorderCharts(
              active.id as ChartWidgetId,
              over.id as ChartWidgetId,
            );
          }
          setActiveDragChart(null);
        }}
        onDragCancel={() => setActiveDragChart(null)}
      >
        <SortableContext
          items={layout.enabledCharts}
          strategy={rectSortingStrategy}
        >
          <div className="grid auto-rows-[288px] grid-flow-row-dense items-start gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 min-[1920px]:grid-cols-5">
            {layout.enabledCharts.map((id) => {
              const span = getChartSpan(id);
              return (
                <SortableChartTile
                  key={id}
                  id={id}
                  span={span}
                  isEditing={isEditing}
                  maxCols={MAX_COLS}
                  onRemove={() => layout.toggleChart(id)}
                  onResize={(delta) =>
                    layout.setChartSpan(id, getChartSpan(id) + delta)
                  }
                >
                  <div className="h-72">{renderChart(id)}</div>
                </SortableChartTile>
              );
            })}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null} zIndex={50}>
          {activeDragChart ? (
            <div className="rounded-xl opacity-90 shadow-xl">
              {renderChart(activeDragChart, true)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <AnimatePresence>
        {isEditing && disabledCharts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="space-y-2">
              <p className="px-1 text-[11px] font-medium text-black/40">
                Add charts
              </p>
              <div className="grid auto-rows-[288px] grid-flow-row-dense items-start gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 min-[1920px]:grid-cols-5">
                {disabledCharts.map((id) => {
                  const span = Math.min(
                    sanitizeSpan(
                      layout.chartSpans[id] ?? DEFAULT_CHART_SPANS[id] ?? 1,
                    ),
                    MAX_COLS,
                  );
                  return (
                    <div
                      key={id}
                      style={{ gridColumn: `span ${span} / span ${span}` }}
                      className="relative h-72 cursor-pointer opacity-45 transition-all duration-150 hover:opacity-90"
                      onClick={() => layout.toggleChart(id)}
                      title={`Add ${CHART_WIDGET_LABELS[id]}`}
                    >
                      {renderChart(id)}
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px]">
                        <span className="flex items-center gap-1.5 rounded-full border border-black/[0.07] bg-white px-3 py-1.5 text-[11px] font-medium text-black/70 shadow-sm">
                          <Plus className="size-3" />
                          {CHART_WIDGET_LABELS[id]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Bottom: Schedule + Occupancy + Activity ─────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(event: DragStartEvent) =>
          setActiveDragBottom(event.active.id as BottomWidgetId)
        }
        onDragEnd={(event: DragEndEvent) => {
          const { active, over } = event;
          if (over && active.id !== over.id) {
            layout.reorderBottom(
              active.id as BottomWidgetId,
              over.id as BottomWidgetId,
            );
          }
          setActiveDragBottom(null);
        }}
        onDragCancel={() => setActiveDragBottom(null)}
      >
        <SortableContext
          items={layout.enabledBottom}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {layout.enabledBottom.map((id) => (
              <SortableBottomTile
                key={id}
                id={id}
                isEditing={isEditing}
                onRemove={() => layout.toggleBottom(id)}
              >
                {renderBottom(id)}
              </SortableBottomTile>
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null} zIndex={50}>
          {activeDragBottom ? (
            <div className="rounded-xl opacity-90 shadow-xl">
              {renderBottom(activeDragBottom)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <AnimatePresence>
        {isEditing && disabledBottom.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {disabledBottom.map((id) => (
                <div
                  key={id}
                  className="relative cursor-pointer opacity-45 transition-all duration-150 hover:opacity-90"
                  onClick={() => layout.toggleBottom(id)}
                  title={`Add ${BOTTOM_WIDGET_LABELS[id]}`}
                >
                  {renderBottom(id)}
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px]">
                    <span className="flex items-center gap-1.5 rounded-full border border-black/[0.07] bg-white px-3 py-1.5 text-[11px] font-medium text-black/70 shadow-sm">
                      <Plus className="size-3" />
                      {BOTTOM_WIDGET_LABELS[id]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
