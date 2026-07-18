"use client";

import { useMemo, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
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
import { useRouter, useSearchParams } from "next/navigation";
import type {
  CalendarEvent,
  CalendarView,
  EventColor,
} from "@/features/rotas/components/event-calendar";
import { EventCalendar } from "@/features/rotas/components/event-calendar";
import { CalendarContext } from "@/features/rotas/components/event-calendar/calendar-context";
import { ClassViewSwitcher } from "@/features/studio/components/class-view-switcher";
import {
  calendarTimeBounds,
  workspaceWeekStartIndex,
} from "@/features/workspace-settings/lib/schedule-display";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_SERVICES = "__all_services__";

export default function StudioSchedulePage() {
  const trpc = useTRPC();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedServiceTypeId = searchParams.get("serviceTypeId") ?? "";
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
  const { data: displaySettings } = useQuery(
    trpc.workspaceSettings.getScheduleDisplaySettings.queryOptions(),
  );
  const weekStartsOn = workspaceWeekStartIndex(displaySettings?.weekStart);

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
      start: startOfWeek(currentDate, { weekStartsOn }),
      end: endOfWeek(currentDate, { weekStartsOn }),
    };
  }, [currentDate, view, weekStartsOn]);

  const { data: schedule, isLoading } = useQuery({
    ...trpc.studioClassesEnhanced.getSchedule.queryOptions({
      startDate: range.start.toISOString(),
      endDate: range.end.toISOString(),
    }),
    placeholderData: (prev) => prev,
  });
  const { data: services = [] } = useQuery(
    trpc.serviceCatalog.list.queryOptions({ includeInactive: true }),
  );

  const events = useMemo<CalendarEvent[]>(() => {
    if (!schedule) return [];

    return Object.values(schedule)
      .flat()
      .filter(
        (cls) =>
          !selectedServiceTypeId ||
          cls.serviceType?.id === selectedServiceTypeId,
      )
      .map((cls) => {
        const booked = cls.studioBookings.filter(
          (booking) =>
            booking.status !== "CANCELLED" && booking.status !== "LATE_CANCEL",
        ).length;
        return {
          id: cls.id,
          title: cls.name,
          start: new Date(cls.startTime),
          end: cls.endTime
            ? new Date(cls.endTime)
            : new Date(new Date(cls.startTime).getTime() + 60 * 60 * 1000),
          color: ((cls.serviceType?.calendarColor ?? cls.classType?.color)
            ? colorToEventColor(
                cls.serviceType?.calendarColor ?? cls.classType?.color ?? "",
              )
            : "blue") as EventColor,
          label: cls.serviceType?.name ?? cls.classType?.name,
          person: cls.instructor
            ? {
                name: cls.instructor.name,
                imageUrl: cls.instructor.profilePhoto,
              }
            : undefined,
          attendance: {
            booked,
            capacity: cls.maxCapacity,
          },
        };
      });
  }, [schedule, selectedServiceTypeId]);

  const timeBounds = useMemo(() => {
    return calendarTimeBounds({
      startMinutes: displaySettings?.startMinutes,
      endMinutes: displaySettings?.endMinutes,
      events,
    });
  }, [displaySettings, events]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col justify-end gap-3 border-b border-black/5 px-8 py-3 sm:flex-row sm:items-center dark:border-white/5">
        <Select
          value={selectedServiceTypeId || ALL_SERVICES}
          onValueChange={(value) => {
            router.replace(
              value === ALL_SERVICES
                ? "/studio/schedule"
                : `/studio/schedule?serviceTypeId=${encodeURIComponent(value)}`,
              { scroll: false },
            );
          }}
        >
          <SelectTrigger className="w-full sm:w-max">
            <SelectValue placeholder="All services" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SERVICES}>All services</SelectItem>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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
            weekStartsOn={weekStartsOn}
            slotMinutes={displaySettings?.slotMinutes ?? 15}
            enableCellEventCreate
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
