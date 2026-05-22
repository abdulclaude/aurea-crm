"use client";

import { useMemo, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { IconLoader as LoaderIcon } from "central-icons/IconLoader";
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CreateClassDialog } from "@/features/studio/components/create-class-dialog";
import { useRouter } from "next/navigation";
import type {
  CalendarEvent,
  CalendarView,
  EventColor,
} from "@/features/rotas/components/event-calendar";
import { EventCalendar } from "@/features/rotas/components/event-calendar";
import { CalendarContext } from "@/features/rotas/components/event-calendar/calendar-context";

export default function StudioSchedulePage() {
  const trpc = useTRPC();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("week");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDefaultStart, setCreateDefaultStart] = useState<
    Date | undefined
  >();
  const [createDefaultEnd, setCreateDefaultEnd] = useState<Date | undefined>();
  const [colorVisibility, setColorVisibility] = useState<
    Record<EventColor, boolean>
  >({
    blue: true,
    emerald: true,
    rose: true,
    violet: true,
    orange: true,
  });

  const range = useMemo(() => {
    if (view === "month") {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      };
    }
    if (view === "day") {
      return {
        start: startOfDay(currentDate),
        end: endOfDay(currentDate),
      };
    }
    if (view === "agenda") {
      return {
        start: startOfDay(currentDate),
        end: endOfDay(addDays(currentDate, 30)),
      };
    }
    return {
      start: startOfWeek(currentDate, { weekStartsOn: 1 }),
      end: endOfWeek(currentDate, { weekStartsOn: 1 }),
    };
  }, [currentDate, view]);

  const { data: schedule, isLoading } = useQuery({
    ...trpc.studioClassesEnhanced.getSchedule.queryOptions({
      startDate: range.start.toISOString(),
      endDate: range.end.toISOString(),
    }),
    placeholderData: (prev) => prev,
  });

  const { data: stats } = useQuery(
    trpc.studioClassesEnhanced.stats.queryOptions(),
  );

  const events = useMemo<CalendarEvent[]>(() => {
    if (!schedule) return [];

    return Object.values(schedule)
      .flat()
      .map((cls) => ({
        id: cls.id,
        title: cls.name,
        description: [
          cls.instructor?.name,
          `${cls._count.studioBooking}/${cls.maxCapacity ?? "∞"} booked`,
        ]
          .filter(Boolean)
          .join(" • "),
        start: new Date(cls.startTime),
        end: cls.endTime
          ? new Date(cls.endTime)
          : new Date(new Date(cls.startTime).getTime() + 60 * 60 * 1000),
        color: (cls.classType?.color
          ? colorToEventColor(cls.classType.color)
          : "blue") as EventColor,
        label: cls.classType?.name,
      }));
  }, [schedule]);

  const timeBounds = useMemo(() => {
    if (events.length === 0) {
      return { startHour: 7, endHour: 22 };
    }

    let earliestHour = 23;
    for (const event of events) {
      earliestHour = Math.min(earliestHour, event.start.getHours());
    }

    return {
      startHour: Math.max(0, earliestHour - 1),
      endHour: 24,
    };
  }, [events]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-end justify-between gap-2 p-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Schedule</h1>
          <p className="text-xs text-primary/75">
            View and manage your class schedule
          </p>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <CalendarContext.Provider
        value={{
          currentDate,
          setCurrentDate,
          colorVisibility,
          setColorVisibility,
          isColorVisible: (color: EventColor | undefined) =>
            colorVisibility[color ?? "blue"],
          toggleColorVisibility: (color: EventColor) => {
            setColorVisibility((prev) => ({
              ...prev,
              [color]: !prev[color],
            }));
          },
        }}
      >
        <div className="flex-1 min-h-0 relative">
          {isLoading && !schedule && (
            <div className="absolute inset-0 flex items-center justify-center z-50">
              <LoaderIcon className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          <EventCalendar
            events={events}
            initialView="week"
            timeBounds={timeBounds}
            enableCellEventCreate={false}
            onViewChange={setView}
            onEventSelect={(event) => {
              router.push(`/studio/classes/${event.id}`);
            }}
            onEventAdd={(event) => {
              setCreateDefaultStart(event.start);
              setCreateDefaultEnd(event.end);
              setIsCreateOpen(true);
            }}
          />
        </div>
      </CalendarContext.Provider>

      <CreateClassDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        defaultStart={createDefaultStart}
        defaultEnd={createDefaultEnd}
      />
    </div>
  );
}

function colorToEventColor(hex: string): EventColor {
  const lower = hex.toLowerCase();
  if (
    lower.includes("emerald") ||
    lower.includes("#10b981") ||
    lower.includes("#059669") ||
    lower.includes("#34d399")
  )
    return "emerald";
  if (
    lower.includes("rose") ||
    lower.includes("#f43f5e") ||
    lower.includes("#e11d48") ||
    lower.includes("#fb7185")
  )
    return "rose";
  if (
    lower.includes("violet") ||
    lower.includes("#8b5cf6") ||
    lower.includes("#7c3aed") ||
    lower.includes("#a78bfa")
  )
    return "violet";
  if (
    lower.includes("orange") ||
    lower.includes("#f97316") ||
    lower.includes("#ea580c") ||
    lower.includes("#fb923c")
  )
    return "orange";
  return "blue";
}
