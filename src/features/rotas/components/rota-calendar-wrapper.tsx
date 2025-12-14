"use client";

import { useState, useMemo, useCallback } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";
import {
  EventCalendar,
  type CalendarEvent,
  type EventColor,
  type CalendarView,
} from "./event-calendar";
import { CalendarContext } from "./event-calendar/calendar-context";

type RouterOutput = inferRouterOutputs<AppRouter>;
type RotaData = RouterOutput["rotas"]["list"][number];

interface RotaCalendarWrapperProps {
  rotas: RotaData[];
  onCreateRota: (start: Date, end: Date) => void;
  onSelectRota: (rotaId: string) => void;
  onUpdateRota?: (rotaId: string, start: Date, end: Date) => void;
  onDeleteRota?: (rotaId: string) => void;
  initialView?: CalendarView;
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
  onViewChange?: (view: CalendarView) => void;
}

// Map status to colors
function getStatusColor(status: string): EventColor {
  const statusColorMap: Record<string, EventColor> = {
    SCHEDULED: "blue",
    CONFIRMED: "emerald",
    CANCELLED: "rose",
    COMPLETED: "violet",
    NO_SHOW: "orange",
  };
  return statusColorMap[status] || "blue";
}

// Transform rotas to calendar events
function rotasToEvents(rotas: RotaData[]): CalendarEvent[] {
  return rotas.map((rota) => {
    // Check if this is a virtual occurrence of a recurring rota
    const isVirtual = (rota as any).isVirtual === true;
    const parentRotaId = (rota as any).parentRotaId;

    return {
      id: rota.id,
      title: rota.worker.name,
      description: [
        rota.contact?.name,
        rota.companyName,
        rota.title,
        rota.location,
      ]
        .filter(Boolean)
        .join(" • "),
      start: new Date(rota.startTime),
      end: new Date(rota.endTime),
      // Use custom color if set, otherwise fall back to status-based color
      color: (rota.color as EventColor) || getStatusColor(rota.status),
      location: rota.location || undefined,
      // Preserve parent rota ID for virtual occurrences
      parentRotaId: isVirtual ? parentRotaId : undefined,
      isRecurring: rota.isRecurring,
    };
  });
}

export function RotaCalendarWrapper({
  rotas,
  onCreateRota,
  onSelectRota,
  onUpdateRota,
  onDeleteRota,
  initialView = "week",
  currentDate: externalCurrentDate,
  onDateChange,
  onViewChange,
}: RotaCalendarWrapperProps) {
  const [internalCurrentDate, setInternalCurrentDate] = useState(new Date());

  // Use external currentDate if provided, otherwise use internal state
  const currentDate = externalCurrentDate ?? internalCurrentDate;
  const setCurrentDate = (date: Date) => {
    setInternalCurrentDate(date);
    onDateChange?.(date);
  };
  const [colorVisibility, setColorVisibility] = useState<
    Record<EventColor, boolean>
  >({
    blue: true,
    emerald: true,
    rose: true,
    violet: true,
    orange: true,
  });

  // Transform rotas to events
  const events = useMemo(() => rotasToEvents(rotas), [rotas]);

  // Calculate dynamic time bounds based on rotas
  const timeBounds = useMemo(() => {
    if (rotas.length === 0) {
      return { startHour: 7, endHour: 24 }; // Default bounds (7am to midnight)
    }

    let earliestHour = 23;

    rotas.forEach((rota) => {
      const startHour = new Date(rota.startTime).getHours();

      // Round down start hour
      earliestHour = Math.min(earliestHour, startHour);
    });

    // Add 1 hour buffer before earliest event
    const startHour = Math.max(0, earliestHour - 1);
    // Always end at midnight (24:00 / 12 AM) for weekly view
    const endHour = 24;

    return { startHour, endHour };
  }, [rotas]);

  // Handle event creation
  const handleEventAdd = useCallback(
    (event: CalendarEvent) => {
      onCreateRota(event.start, event.end);
    },
    [onCreateRota]
  );

  // Handle event update
  const handleEventUpdate = useCallback(
    (event: CalendarEvent) => {
      if (onUpdateRota) {
        onUpdateRota(event.id, event.start, event.end);
      }
    },
    [onUpdateRota]
  );

  // Handle event delete
  const handleEventDelete = useCallback(
    (eventId: string) => {
      if (onDeleteRota) {
        onDeleteRota(eventId);
      }
    },
    [onDeleteRota]
  );

  // Handle event select
  const handleEventSelect = useCallback(
    (event: CalendarEvent) => {
      // If this is a virtual occurrence of a recurring event, use the parent rota ID
      // This ensures clicking on any occurrence opens the master event dialog
      const rotaId = event.parentRotaId || event.id;
      onSelectRota(rotaId);
    },
    [onSelectRota]
  );

  return (
    <CalendarContext.Provider
      value={{
        currentDate,
        setCurrentDate,
        colorVisibility,
        setColorVisibility,
        isColorVisible: (color: EventColor | undefined) => colorVisibility[color ?? "blue"],
        toggleColorVisibility: (color: EventColor) => {
          setColorVisibility((prev) => ({
            ...prev,
            [color]: !prev[color],
          }));
        },
      }}
    >
      <EventCalendar
        events={events}
        onEventAdd={handleEventAdd}
        onEventUpdate={handleEventUpdate}
        onEventDelete={handleEventDelete}
        onEventSelect={handleEventSelect}
        onViewChange={onViewChange}
        initialView={initialView}
        timeBounds={timeBounds}
      />
    </CalendarContext.Provider>
  );
}
