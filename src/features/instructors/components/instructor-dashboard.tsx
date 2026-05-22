"use client";

import { useQuery } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { useState } from "react";
import { Plus, LoaderCircle } from "lucide-react";
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

import { useTRPC } from "@/trpc/client";
import { useIsInstructor } from "../hooks/use-is-instructor";
import { StatCard } from "@/features/dashboard/components";
import { sanitizeSpan } from "@/features/dashboard/helpers";
import { MAX_COLS } from "@/features/dashboard/constants";
import {
  useInstructorDashboardLayout,
  ALL_INSTRUCTOR_STAT_IDS,
  INSTRUCTOR_STAT_LABELS,
  ALL_INSTRUCTOR_CHART_IDS,
  INSTRUCTOR_CHART_LABELS,
  DEFAULT_INSTRUCTOR_CHART_SPANS,
  ALL_INSTRUCTOR_BOTTOM_IDS,
  INSTRUCTOR_BOTTOM_LABELS,
  type InstructorStatWidgetId,
  type InstructorChartWidgetId,
  type InstructorBottomWidgetId,
} from "@/stores/instructor-dashboard-layout";
import {
  InstDashboardHeader,
  InstTodayClasses,
  InstNextClass,
  InstUpcoming,
  InstRecentEarnings,
  InstChartClasses,
  InstChartEarnings,
  InstChartBookings,
  InstSortableStat,
  InstSortableChart,
  InstSortableBottom,
  ChartDateRange,
} from "./dashboard";

export function InstructorDashboard() {
  const trpc = useTRPC();
  const { instructor } = useIsInstructor();
  const layout = useInstructorDashboardLayout();

  const [chartRange, setChartRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data: stats, isLoading: statsLoading } = useQuery(
    trpc.instructors.getMyDashboardStats.queryOptions(),
  );

  const { data: classes } = useQuery(
    trpc.instructors.getMyClasses.queryOptions({ status: "upcoming" }),
  );

  const { data: earnings } = useQuery(
    trpc.instructors.getMyEarnings.queryOptions({}),
  );

  const trendInput = { startDate: chartRange.from, endDate: chartRange.to };

  const { data: classesTrend } = useQuery(
    trpc.instructors.getMyClassesTrend.queryOptions(trendInput),
  );

  const { data: earningsTrend } = useQuery(
    trpc.instructors.getMyEarningsTrend.queryOptions(trendInput),
  );

  const { data: bookingsTrend } = useQuery(
    trpc.instructors.getMyBookingsTrend.queryOptions(trendInput),
  );

  const { data: upcomingClasses } = useQuery(
    trpc.instructors.getMyUpcomingClasses.queryOptions(),
  );

  const currency = stats?.currency ?? "GBP";
  const fmt = (amount: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(amount);

  // ─── Stats config ──────────────────────────────────────────────────────────

  const ALL_STATS_DATA: Record<
    InstructorStatWidgetId,
    { label: string; value: string | number; color: string }
  > = {
    "inst-stat-classes-today": {
      label: "Classes today",
      value: stats?.classesToday ?? "—",
      color: "#3b82f6",
    },
    "inst-stat-hours-month": {
      label: "Hours this month",
      value: stats ? `${stats.hoursMonth}h` : "—",
      color: "#8b5cf6",
    },
    "inst-stat-earned-month": {
      label: "Earned this month",
      value: stats ? fmt(stats.earnedMonth) : "—",
      color: "#10b981",
    },
    "inst-stat-classes-month": {
      label: "Classes this month",
      value: stats?.classesMonth ?? "—",
      color: "#6366f1",
    },
    "inst-stat-all-time-classes": {
      label: "All-time classes",
      value: stats?.allTimeClasses ?? "—",
      color: "#f59e0b",
    },
    "inst-stat-hourly-rate": {
      label: "Hourly rate",
      value: stats ? fmt(stats.hourlyRate) : "—",
      color: "#06b6d4",
    },
    "inst-stat-avg-bookings": {
      label: "Avg. bookings",
      value: stats?.avgBookings ?? "—",
      color: "#ec4899",
    },
    "inst-stat-upcoming-classes": {
      label: "Upcoming classes",
      value: stats?.upcomingClasses ?? "—",
      color: "#f97316",
    },
  };

  // ─── DnD state ─────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const [activeDragStat, setActiveDragStat] =
    useState<InstructorStatWidgetId | null>(null);
  const [activeDragChart, setActiveDragChart] =
    useState<InstructorChartWidgetId | null>(null);
  const [activeDragBottom, setActiveDragBottom] =
    useState<InstructorBottomWidgetId | null>(null);

  const { isEditing } = layout;

  const getChartSpan = (id: InstructorChartWidgetId): number => {
    const raw =
      layout.chartSpans[id] ?? DEFAULT_INSTRUCTOR_CHART_SPANS[id] ?? 1;
    return Math.min(sanitizeSpan(raw), MAX_COLS);
  };

  const disabledStats = ALL_INSTRUCTOR_STAT_IDS.filter(
    (id) => !layout.enabledStats.includes(id),
  );
  const disabledCharts = ALL_INSTRUCTOR_CHART_IDS.filter(
    (id) => !layout.enabledCharts.includes(id),
  );
  const disabledBottom = ALL_INSTRUCTOR_BOTTOM_IDS.filter(
    (id) => !layout.enabledBottom.includes(id),
  );

  const handleDoubleClickEdit = () => {
    if (!isEditing) layout.startEditing();
  };

  // ─── Chart renderer ────────────────────────────────────────────────────────

  const renderChart = (id: InstructorChartWidgetId, forOverlay = false) => {
    const editing = isEditing || forOverlay;
    switch (id) {
      case "inst-chart-classes-trend":
        return (
          <InstChartClasses data={classesTrend ?? []} isEditing={editing} />
        );
      case "inst-chart-earnings-trend":
        return (
          <InstChartEarnings
            data={earningsTrend ?? []}
            currency={currency}
            isEditing={editing}
          />
        );
      case "inst-chart-bookings-trend":
        return (
          <InstChartBookings data={bookingsTrend ?? []} isEditing={editing} />
        );
      default:
        return null;
    }
  };

  // ─── Bottom renderer ───────────────────────────────────────────────────────

  const renderBottom = (id: InstructorBottomWidgetId) => {
    switch (id) {
      case "inst-bottom-today-classes":
        return <InstTodayClasses data={classes} isEditing={isEditing} />;
      case "inst-bottom-next-class":
        return <InstNextClass data={classes} isEditing={isEditing} />;
      case "inst-bottom-upcoming":
        return <InstUpcoming data={upcomingClasses} isEditing={isEditing} />;
      case "inst-bottom-recent-earnings":
        return (
          <InstRecentEarnings
            data={
              earnings
                ? {
                    currency: earnings.currency,
                    hourlyRate: earnings.hourlyRate,
                    classes: earnings.classes,
                  }
                : undefined
            }
            isEditing={isEditing}
          />
        );
      default:
        return null;
    }
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center gap-3 py-24 text-sm text-black/40">
        <LoaderCircle className="size-4 animate-spin" />
        Loading dashboard...
      </div>
    );
  }

  return (
    <div
      className="space-y-4 overflow-y-auto p-5"
      onDoubleClick={handleDoubleClickEdit}
    >
      {/* Header */}
      <InstDashboardHeader
        instructorName={instructor?.name}
        studioName={instructor?.location?.companyName}
        isEditing={isEditing}
        onToggleEdit={layout.toggleEditing}
        onReset={layout.resetAll}
      />

      {/* ─── Stats ────────────────────────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e: DragStartEvent) =>
          setActiveDragStat(e.active.id as InstructorStatWidgetId)
        }
        onDragEnd={(e: DragEndEvent) => {
          const { active, over } = e;
          if (over && active.id !== over.id) {
            layout.reorderStats(
              active.id as InstructorStatWidgetId,
              over.id as InstructorStatWidgetId,
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
                <InstSortableStat
                  key={id}
                  id={id}
                  isEditing={isEditing}
                  onRemove={() => layout.toggleStat(id)}
                >
                  <StatCard stat={stat} isEditing={isEditing} />
                </InstSortableStat>
              );
            })}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null} zIndex={50}>
          {activeDragStat && ALL_STATS_DATA[activeDragStat] ? (
            <div className="rounded-xl opacity-90 shadow-xl">
              <StatCard stat={ALL_STATS_DATA[activeDragStat]} isEditing />
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
                  title={`Add ${INSTRUCTOR_STAT_LABELS[id]}`}
                >
                  <StatCard stat={ALL_STATS_DATA[id]} />
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px]">
                    <span className="flex items-center gap-1.5 rounded-full border border-black/[0.07] bg-white px-3 py-1.5 text-[11px] font-medium text-black/70 shadow-sm">
                      <Plus className="size-3" />
                      {INSTRUCTOR_STAT_LABELS[id]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Charts ───────────────────────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e: DragStartEvent) =>
          setActiveDragChart(e.active.id as InstructorChartWidgetId)
        }
        onDragEnd={(e: DragEndEvent) => {
          const { active, over } = e;
          if (over && active.id !== over.id) {
            layout.reorderCharts(
              active.id as InstructorChartWidgetId,
              over.id as InstructorChartWidgetId,
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
                <InstSortableChart
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
                </InstSortableChart>
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
                      layout.chartSpans[id] ??
                        DEFAULT_INSTRUCTOR_CHART_SPANS[id] ??
                        1,
                    ),
                    MAX_COLS,
                  );
                  return (
                    <div
                      key={id}
                      style={{ gridColumn: `span ${span} / span ${span}` }}
                      className="relative h-72 cursor-pointer opacity-45 transition-all duration-150 hover:opacity-90"
                      onClick={() => layout.toggleChart(id)}
                      title={`Add ${INSTRUCTOR_CHART_LABELS[id]}`}
                    >
                      {renderChart(id)}
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px]">
                        <span className="flex items-center gap-1.5 rounded-full border border-black/[0.07] bg-white px-3 py-1.5 text-[11px] font-medium text-black/70 shadow-sm">
                          <Plus className="size-3" />
                          {INSTRUCTOR_CHART_LABELS[id]}
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

      {/* ─── Bottom widgets ───────────────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e: DragStartEvent) =>
          setActiveDragBottom(e.active.id as InstructorBottomWidgetId)
        }
        onDragEnd={(e: DragEndEvent) => {
          const { active, over } = e;
          if (over && active.id !== over.id) {
            layout.reorderBottom(
              active.id as InstructorBottomWidgetId,
              over.id as InstructorBottomWidgetId,
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
              <InstSortableBottom
                key={id}
                id={id}
                isEditing={isEditing}
                onRemove={() => layout.toggleBottom(id)}
              >
                {renderBottom(id)}
              </InstSortableBottom>
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
                  title={`Add ${INSTRUCTOR_BOTTOM_LABELS[id]}`}
                >
                  {renderBottom(id)}
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px]">
                    <span className="flex items-center gap-1.5 rounded-full border border-black/[0.07] bg-white px-3 py-1.5 text-[11px] font-medium text-black/70 shadow-sm">
                      <Plus className="size-3" />
                      {INSTRUCTOR_BOTTOM_LABELS[id]}
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
