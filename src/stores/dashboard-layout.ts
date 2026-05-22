import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// ─── Section: Stats ──────────────────────────────────────────────────────────

export type StatWidgetId =
  | "stat-active-memberships"
  | "stat-classes-today"
  | "stat-checkins-today"
  | "stat-visits-month"
  | "stat-total-sales"
  | "stat-arpm"
  | "stat-no-show-rate"
  | "stat-class-utilization"
  | "stat-churn-rate"
  | "stat-new-members"
  | "stat-expiring-soon"
  | "stat-first-visit-rate"
  | "stat-intro-conversion"
  | "stat-referral-conversion"
  | "stat-automation-conversions"
  | "stat-plan-net-growth";

export const ALL_STAT_WIDGET_IDS: StatWidgetId[] = [
  "stat-active-memberships",
  "stat-classes-today",
  "stat-checkins-today",
  "stat-visits-month",
  "stat-total-sales",
  "stat-arpm",
  "stat-no-show-rate",
  "stat-class-utilization",
  "stat-churn-rate",
  "stat-new-members",
  "stat-expiring-soon",
  "stat-first-visit-rate",
  "stat-intro-conversion",
  "stat-referral-conversion",
  "stat-automation-conversions",
  "stat-plan-net-growth",
];

export const STAT_WIDGET_LABELS: Record<StatWidgetId, string> = {
  "stat-active-memberships": "Active memberships",
  "stat-classes-today": "Classes today",
  "stat-checkins-today": "Check-ins today",
  "stat-visits-month": "Visits this month",
  "stat-total-sales": "Total sales",
  "stat-arpm": "Avg. revenue / member",
  "stat-no-show-rate": "No-show rate",
  "stat-class-utilization": "Class utilization",
  "stat-churn-rate": "Churn rate",
  "stat-new-members": "New members",
  "stat-expiring-soon": "Expiring soon",
  "stat-first-visit-rate": "First visit rate",
  "stat-intro-conversion": "Intro conversion",
  "stat-referral-conversion": "Referral conversion",
  "stat-automation-conversions": "Automation conversions",
  "stat-plan-net-growth": "Plan net growth",
};

// ─── Section: Charts ─────────────────────────────────────────────────────────

export type ChartWidgetId =
  | "chart-visits"
  | "chart-memberships"
  | "chart-revenue"
  | "chart-revenue-category"
  | "chart-revenue-weekday"
  | "chart-plan-breakdown"
  | "chart-conversion-sankey";

export const ALL_CHART_WIDGET_IDS: ChartWidgetId[] = [
  "chart-visits",
  "chart-memberships",
  "chart-revenue",
  "chart-revenue-category",
  "chart-revenue-weekday",
  "chart-plan-breakdown",
  "chart-conversion-sankey",
];

export const CHART_WIDGET_LABELS: Record<ChartWidgetId, string> = {
  "chart-visits": "Visits over time",
  "chart-memberships": "New memberships",
  "chart-revenue": "Revenue over time",
  "chart-revenue-category": "Revenue by category",
  "chart-revenue-weekday": "Revenue by weekday",
  "chart-plan-breakdown": "By class type",
  "chart-conversion-sankey": "Conversion flow",
};

export const DEFAULT_CHART_SPANS: Record<ChartWidgetId, number> = {
  "chart-visits": 2,
  "chart-memberships": 2,
  "chart-revenue": 2,
  "chart-revenue-category": 1,
  "chart-revenue-weekday": 1,
  "chart-plan-breakdown": 2,
  "chart-conversion-sankey": 2,
};

// ─── Section: Bottom ─────────────────────────────────────────────────────────

export type BottomWidgetId =
  | "bottom-schedule"
  | "bottom-occupancy"
  | "bottom-activity"
  | "bottom-at-risk"
  | "bottom-waitlist"
  | "bottom-class-type-utilization"
  | "bottom-instructor-utilization"
  | "bottom-automation-attribution"
  | "bottom-campaign-performance";

export const ALL_BOTTOM_WIDGET_IDS: BottomWidgetId[] = [
  "bottom-schedule",
  "bottom-occupancy",
  "bottom-activity",
  "bottom-at-risk",
  "bottom-waitlist",
  "bottom-class-type-utilization",
  "bottom-instructor-utilization",
  "bottom-automation-attribution",
  "bottom-campaign-performance",
];

export const BOTTOM_WIDGET_LABELS: Record<BottomWidgetId, string> = {
  "bottom-schedule": "Today's schedule",
  "bottom-occupancy": "Class occupancy",
  "bottom-activity": "Recent activity",
  "bottom-at-risk": "At-risk members",
  "bottom-waitlist": "Waitlist demand",
  "bottom-class-type-utilization": "Class type utilization",
  "bottom-instructor-utilization": "Instructor utilization",
  "bottom-automation-attribution": "Automation attribution",
  "bottom-campaign-performance": "Campaign performance",
};

// ─── Combined section type ───────────────────────────────────────────────────

export type DashboardSection = "stats" | "charts" | "bottom";

const DEFAULT_ENABLED_STATS: StatWidgetId[] = [
  "stat-total-sales",
  "stat-new-members",
  "stat-classes-today",
  "stat-visits-month",
];

// ─── Store ───────────────────────────────────────────────────────────────────

interface DashboardLayoutState {
  enabledStats: StatWidgetId[];
  enabledCharts: ChartWidgetId[];
  enabledBottom: BottomWidgetId[];
  chartSpans: Partial<Record<ChartWidgetId, number>>;
  isEditing: boolean;

  toggleStat: (id: StatWidgetId) => void;
  reorderStats: (activeId: StatWidgetId, overId: StatWidgetId) => void;

  toggleChart: (id: ChartWidgetId) => void;
  reorderCharts: (activeId: ChartWidgetId, overId: ChartWidgetId) => void;
  setChartSpan: (id: ChartWidgetId, span: number) => void;

  toggleBottom: (id: BottomWidgetId) => void;
  reorderBottom: (activeId: BottomWidgetId, overId: BottomWidgetId) => void;

  startEditing: () => void;
  stopEditing: () => void;
  toggleEditing: () => void;
  resetAll: () => void;
}

function reorder<T>(list: T[], activeId: T, overId: T): T[] {
  const arr = [...list];
  const from = arr.indexOf(activeId);
  const to = arr.indexOf(overId);
  if (from === -1 || to === -1) return arr;
  arr.splice(from, 1);
  arr.splice(to, 0, activeId);
  return arr;
}

export const useDashboardLayout = create<DashboardLayoutState>()(
  persist(
    (set) => ({
      enabledStats: [...DEFAULT_ENABLED_STATS],
      enabledCharts: [...ALL_CHART_WIDGET_IDS],
      enabledBottom: [...ALL_BOTTOM_WIDGET_IDS],
      chartSpans: { ...DEFAULT_CHART_SPANS },
      isEditing: false,

      toggleStat: (id) =>
        set((s) => ({
          enabledStats: s.enabledStats.includes(id)
            ? s.enabledStats.filter((w) => w !== id)
            : [...s.enabledStats, id],
        })),
      reorderStats: (activeId, overId) =>
        set((s) => ({ enabledStats: reorder(s.enabledStats, activeId, overId) })),

      toggleChart: (id) =>
        set((s) => ({
          enabledCharts: s.enabledCharts.includes(id)
            ? s.enabledCharts.filter((w) => w !== id)
            : [...s.enabledCharts, id],
        })),
      reorderCharts: (activeId, overId) =>
        set((s) => ({ enabledCharts: reorder(s.enabledCharts, activeId, overId) })),
      setChartSpan: (id, span) =>
        set((s) => ({
          chartSpans: { ...s.chartSpans, [id]: Math.max(1, Math.min(5, span)) },
        })),

      toggleBottom: (id) =>
        set((s) => ({
          enabledBottom: s.enabledBottom.includes(id)
            ? s.enabledBottom.filter((w) => w !== id)
            : [...s.enabledBottom, id],
        })),
      reorderBottom: (activeId, overId) =>
        set((s) => ({ enabledBottom: reorder(s.enabledBottom, activeId, overId) })),

      startEditing: () => set({ isEditing: true }),
      stopEditing: () => set({ isEditing: false }),
      toggleEditing: () => set((s) => ({ isEditing: !s.isEditing })),

      resetAll: () =>
        set({
          enabledStats: [...DEFAULT_ENABLED_STATS],
          enabledCharts: [...ALL_CHART_WIDGET_IDS],
          enabledBottom: [...ALL_BOTTOM_WIDGET_IDS],
          chartSpans: { ...DEFAULT_CHART_SPANS },
          isEditing: false,
        }),
    }),
    {
      name: "aurea:dashboard-layout-v9",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        enabledStats: state.enabledStats,
        enabledCharts: state.enabledCharts,
        enabledBottom: state.enabledBottom,
        chartSpans: state.chartSpans,
      }),
    },
  ),
);
