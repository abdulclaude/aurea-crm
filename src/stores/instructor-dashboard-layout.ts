import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// ─── Section: Stats ──────────────────────────────────────────────────────────

export type InstructorStatWidgetId =
  | "inst-stat-classes-today"
  | "inst-stat-hours-month"
  | "inst-stat-earned-month"
  | "inst-stat-classes-month"
  | "inst-stat-all-time-classes"
  | "inst-stat-hourly-rate"
  | "inst-stat-avg-bookings"
  | "inst-stat-upcoming-classes";

export const ALL_INSTRUCTOR_STAT_IDS: InstructorStatWidgetId[] = [
  "inst-stat-classes-today",
  "inst-stat-hours-month",
  "inst-stat-earned-month",
  "inst-stat-classes-month",
  "inst-stat-all-time-classes",
  "inst-stat-hourly-rate",
  "inst-stat-avg-bookings",
  "inst-stat-upcoming-classes",
];

export const INSTRUCTOR_STAT_LABELS: Record<InstructorStatWidgetId, string> = {
  "inst-stat-classes-today": "Classes today",
  "inst-stat-hours-month": "Hours this month",
  "inst-stat-earned-month": "Earned this month",
  "inst-stat-classes-month": "Classes this month",
  "inst-stat-all-time-classes": "All-time classes",
  "inst-stat-hourly-rate": "Hourly rate",
  "inst-stat-avg-bookings": "Avg. bookings",
  "inst-stat-upcoming-classes": "Upcoming classes",
};

// ─── Section: Charts ─────────────────────────────────────────────────────────

export type InstructorChartWidgetId =
  | "inst-chart-classes-trend"
  | "inst-chart-earnings-trend"
  | "inst-chart-bookings-trend";

export const ALL_INSTRUCTOR_CHART_IDS: InstructorChartWidgetId[] = [
  "inst-chart-classes-trend",
  "inst-chart-earnings-trend",
  "inst-chart-bookings-trend",
];

export const INSTRUCTOR_CHART_LABELS: Record<InstructorChartWidgetId, string> =
  {
    "inst-chart-classes-trend": "Classes over time",
    "inst-chart-earnings-trend": "Earnings over time",
    "inst-chart-bookings-trend": "Bookings per class",
  };

export const DEFAULT_INSTRUCTOR_CHART_SPANS: Record<
  InstructorChartWidgetId,
  number
> = {
  "inst-chart-classes-trend": 2,
  "inst-chart-earnings-trend": 2,
  "inst-chart-bookings-trend": 1,
};

// ─── Section: Bottom ─────────────────────────────────────────────────────────

export type InstructorBottomWidgetId =
  | "inst-bottom-today-classes"
  | "inst-bottom-next-class"
  | "inst-bottom-upcoming"
  | "inst-bottom-recent-earnings";

export const ALL_INSTRUCTOR_BOTTOM_IDS: InstructorBottomWidgetId[] = [
  "inst-bottom-today-classes",
  "inst-bottom-next-class",
  "inst-bottom-upcoming",
  "inst-bottom-recent-earnings",
];

export const INSTRUCTOR_BOTTOM_LABELS: Record<
  InstructorBottomWidgetId,
  string
> = {
  "inst-bottom-today-classes": "Today's classes",
  "inst-bottom-next-class": "Next class",
  "inst-bottom-upcoming": "Upcoming schedule",
  "inst-bottom-recent-earnings": "Recent earnings",
};

// ─── Store ───────────────────────────────────────────────────────────────────

interface InstructorDashboardLayoutState {
  enabledStats: InstructorStatWidgetId[];
  enabledCharts: InstructorChartWidgetId[];
  enabledBottom: InstructorBottomWidgetId[];
  chartSpans: Partial<Record<InstructorChartWidgetId, number>>;
  isEditing: boolean;

  toggleStat: (id: InstructorStatWidgetId) => void;
  reorderStats: (
    activeId: InstructorStatWidgetId,
    overId: InstructorStatWidgetId,
  ) => void;

  toggleChart: (id: InstructorChartWidgetId) => void;
  reorderCharts: (
    activeId: InstructorChartWidgetId,
    overId: InstructorChartWidgetId,
  ) => void;
  setChartSpan: (id: InstructorChartWidgetId, span: number) => void;

  toggleBottom: (id: InstructorBottomWidgetId) => void;
  reorderBottom: (
    activeId: InstructorBottomWidgetId,
    overId: InstructorBottomWidgetId,
  ) => void;

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

const DEFAULT_ENABLED_STATS: InstructorStatWidgetId[] = [
  "inst-stat-classes-today",
  "inst-stat-hours-month",
  "inst-stat-upcoming-classes",
  "inst-stat-avg-bookings",
];

const DEFAULT_ENABLED_CHARTS: InstructorChartWidgetId[] = [
  "inst-chart-classes-trend",
  "inst-chart-earnings-trend",
];

const DEFAULT_ENABLED_BOTTOM: InstructorBottomWidgetId[] = [
  "inst-bottom-today-classes",
  "inst-bottom-next-class",
  "inst-bottom-recent-earnings",
];

export const useInstructorDashboardLayout =
  create<InstructorDashboardLayoutState>()(
    persist(
      (set) => ({
        enabledStats: [...DEFAULT_ENABLED_STATS],
        enabledCharts: [...DEFAULT_ENABLED_CHARTS],
        enabledBottom: [...DEFAULT_ENABLED_BOTTOM],
        chartSpans: { ...DEFAULT_INSTRUCTOR_CHART_SPANS },
        isEditing: false,

        toggleStat: (id) =>
          set((s) => ({
            enabledStats: s.enabledStats.includes(id)
              ? s.enabledStats.filter((w) => w !== id)
              : [...s.enabledStats, id],
          })),
        reorderStats: (activeId, overId) =>
          set((s) => ({
            enabledStats: reorder(s.enabledStats, activeId, overId),
          })),

        toggleChart: (id) =>
          set((s) => ({
            enabledCharts: s.enabledCharts.includes(id)
              ? s.enabledCharts.filter((w) => w !== id)
              : [...s.enabledCharts, id],
          })),
        reorderCharts: (activeId, overId) =>
          set((s) => ({
            enabledCharts: reorder(s.enabledCharts, activeId, overId),
          })),
        setChartSpan: (id, span) =>
          set((s) => ({
            chartSpans: {
              ...s.chartSpans,
              [id]: Math.max(1, Math.min(5, span)),
            },
          })),

        toggleBottom: (id) =>
          set((s) => ({
            enabledBottom: s.enabledBottom.includes(id)
              ? s.enabledBottom.filter((w) => w !== id)
              : [...s.enabledBottom, id],
          })),
        reorderBottom: (activeId, overId) =>
          set((s) => ({
            enabledBottom: reorder(s.enabledBottom, activeId, overId),
          })),

        startEditing: () => set({ isEditing: true }),
        stopEditing: () => set({ isEditing: false }),
        toggleEditing: () => set((s) => ({ isEditing: !s.isEditing })),

        resetAll: () =>
          set({
            enabledStats: [...DEFAULT_ENABLED_STATS],
            enabledCharts: [...DEFAULT_ENABLED_CHARTS],
            enabledBottom: [...DEFAULT_ENABLED_BOTTOM],
            chartSpans: { ...DEFAULT_INSTRUCTOR_CHART_SPANS },
            isEditing: false,
          }),
      }),
      {
        name: "aurea:instructor-dashboard-layout-v2",
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
