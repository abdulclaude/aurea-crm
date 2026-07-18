"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addHours,
  addMinutes,
  areIntervalsOverlapping,
  differenceInMinutes,
  eachDayOfInterval,
  eachHourOfInterval,
  endOfWeek,
  format,
  getHours,
  getMinutes,
  isBefore,
  isSameDay,
  isToday,
  startOfDay,
  startOfWeek,
} from "date-fns";

import {
  DraggableEvent,
  DroppableCell,
  EventItem,
  isMultiDayEvent,
  useCalendarDnd,
  useCurrentTimeIndicator,
  WeekCellsHeight,
  type CalendarEvent,
} from "@/features/rotas/components/event-calendar";
import {
  StartHour,
  EndHour,
} from "@/features/rotas/components/event-calendar/constants";
import { cn } from "@/lib/utils";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventSelect: (event: CalendarEvent) => void;
  onEventCreate?: (startTime: Date, endTime?: Date) => void;
  timeBounds?: { startHour: number; endHour: number };
  weekStartsOn?: 0 | 1 | 6;
  slotMinutes?: number;
}

interface PositionedEvent {
  event: CalendarEvent;
  top: number;
  height: number;
  left: number;
  width: number;
  zIndex: number;
}

export function WeekView({
  currentDate,
  events,
  onEventSelect,
  onEventCreate,
  timeBounds = { startHour: StartHour, endHour: EndHour },
  weekStartsOn = 1,
  slotMinutes = 15,
}: WeekViewProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Date | null>(null);
  const days = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate, weekStartsOn]);

  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn }),
    [currentDate, weekStartsOn]
  );

  const hours = useMemo(() => {
    const dayStart = startOfDay(currentDate);
    return eachHourOfInterval({
      start: addHours(dayStart, timeBounds.startHour),
      end: addHours(dayStart, timeBounds.endHour - 1),
    });
  }, [currentDate, timeBounds]);

  // Get all-day events and multi-day events for the week
  const allDayEvents = useMemo(() => {
    return events
      .filter((event) => {
        // Include explicitly marked all-day events or multi-day events
        return event.allDay || isMultiDayEvent(event);
      })
      .filter((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return days.some(
          (day) =>
            isSameDay(day, eventStart) ||
            isSameDay(day, eventEnd) ||
            (day > eventStart && day < eventEnd)
        );
      });
  }, [events, days]);

  // Process events for each day to calculate positions
  const processedDayEvents = useMemo(() => {
    const result = days.map((day) => {
      // Get events for this day that are not all-day events or multi-day events
      const dayEvents = events.filter((event) => {
        // Skip all-day events and multi-day events
        if (event.allDay || isMultiDayEvent(event)) return false;

        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);

        // Check if event is on this day
        return (
          isSameDay(day, eventStart) ||
          isSameDay(day, eventEnd) ||
          (eventStart < day && eventEnd > day)
        );
      });

      // Sort events by start time and duration
      const sortedEvents = [...dayEvents].sort((a, b) => {
        const aStart = new Date(a.start);
        const bStart = new Date(b.start);
        const aEnd = new Date(a.end);
        const bEnd = new Date(b.end);

        // First sort by start time
        if (aStart < bStart) return -1;
        if (aStart > bStart) return 1;

        // If start times are equal, sort by duration (longer events first)
        const aDuration = differenceInMinutes(aEnd, aStart);
        const bDuration = differenceInMinutes(bEnd, bStart);
        return bDuration - aDuration;
      });

      // Calculate positions for each event
      const positionedEvents: PositionedEvent[] = [];
      const dayStart = startOfDay(day);

      // Build event metadata with adjusted times
      const eventMetadata = sortedEvents.map((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);

        // Adjust start and end times if they're outside this day
        const adjustedStart = isSameDay(day, eventStart)
          ? eventStart
          : dayStart;
        const adjustedEnd = isSameDay(day, eventEnd)
          ? eventEnd
          : addHours(dayStart, 24);

        const startHour =
          getHours(adjustedStart) + getMinutes(adjustedStart) / 60;
        const endHour = getHours(adjustedEnd) + getMinutes(adjustedEnd) / 60;

        return {
          event,
          adjustedStart,
          adjustedEnd,
          startHour,
          endHour,
          top: (startHour - timeBounds.startHour) * WeekCellsHeight,
          height: (endHour - startHour) * WeekCellsHeight,
          column: 0,
          maxColumns: 1,
        };
      });

      // Assign columns using a greedy algorithm
      const columns: (typeof eventMetadata)[] = [];

      eventMetadata.forEach((meta) => {
        // Find the first column where this event doesn't overlap
        let columnIndex = 0;
        let placed = false;

        while (!placed) {
          const column = columns[columnIndex];
          if (!column) {
            columns[columnIndex] = [meta];
            placed = true;
          } else {
            const overlaps = column.some((other) =>
              areIntervalsOverlapping(
                { start: meta.adjustedStart, end: meta.adjustedEnd },
                { start: other.adjustedStart, end: other.adjustedEnd }
              )
            );
            if (!overlaps) {
              column.push(meta);
              placed = true;
            } else {
              columnIndex++;
            }
          }
        }

        meta.column = columnIndex;
      });

      // Calculate max columns for each event (for proper width sizing)
      const totalColumns = columns.length;
      eventMetadata.forEach((meta) => {
        // Find all events that overlap with this one
        const overlappingEvents = eventMetadata.filter((other) =>
          areIntervalsOverlapping(
            { start: meta.adjustedStart, end: meta.adjustedEnd },
            { start: other.adjustedStart, end: other.adjustedEnd }
          )
        );
        // The max column is the highest column index among overlapping events + 1
        meta.maxColumns = Math.max(
          ...overlappingEvents.map((e) => e.column + 1)
        );
      });

      // Create positioned events with proper widths
      eventMetadata.forEach((meta) => {
        // Each event takes equal width within its overlapping group
        const width = 1 / meta.maxColumns;
        const left = meta.column / meta.maxColumns;

        positionedEvents.push({
          event: meta.event,
          top: meta.top,
          height: meta.height,
          left,
          width,
          zIndex: 10 + meta.column,
        });
      });

      return positionedEvents;
    });

    return result;
  }, [days, events, timeBounds]);

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    onEventSelect(event);
  };

  const showAllDaySection = allDayEvents.length > 0;
  const { currentTimePosition, currentTimeVisible } = useCurrentTimeIndicator(
    currentDate,
    "week",
    { timeBounds, weekStartsOn },
  );

  useEffect(() => {
    if (!isSelecting) {
      return;
    }

    const handleMouseUp = () => {
      if (!selectionStart || !selectionEnd) {
        setIsSelecting(false);
        return;
      }

      const [start, end] =
        selectionStart <= selectionEnd
          ? [selectionStart, selectionEnd]
          : [selectionEnd, selectionStart];
      const isSingleSlot = selectionStart.getTime() === selectionEnd.getTime();
      const endWithBuffer = addMinutes(end, isSingleSlot ? 60 : slotMinutes);

      onEventCreate?.(start, endWithBuffer);
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [isSelecting, selectionStart, selectionEnd, onEventCreate, slotMinutes]);


  return (
    <div data-slot="week-view" className="flex h-full flex-col">
      <div className="bg-background border-border/70 sticky top-0 z-30 grid grid-cols-8 border-y uppercase">
        <div className="py-2" />
        {days.map((day) => (
          <div
            key={day.toString()}
            className="data-today:text-primary text-primary/50 py-2 text-center text-xs data-today:font-medium"
            data-today={isToday(day) || undefined}
          >
            <span className="sm:hidden" aria-hidden="true">
              {format(day, "E")[0]} {format(day, "d")}
            </span>
            <span className="max-sm:hidden">{format(day, "EEE dd")}</span>
          </div>
        ))}
      </div>

      {showAllDaySection && (
        <div className="border-border/70 bg-muted/50 border-b">
          <div className="grid grid-cols-8">
            <div className="border-border/70 relative border-r">
              <span className="text-primary/70 absolute bottom-0 left-0 h-6 w-16 max-w-full pe-2 text-right text-[10px] sm:pe-4 sm:text-xs">
                All day
              </span>
            </div>
            {days.map((day, dayIndex) => {
              const dayAllDayEvents = allDayEvents.filter((event) => {
                const eventStart = new Date(event.start);
                const eventEnd = new Date(event.end);
                return (
                  isSameDay(day, eventStart) ||
                  (day > eventStart && day < eventEnd) ||
                  isSameDay(day, eventEnd)
                );
              });

              return (
                <div
                  key={day.toString()}
                  className="border-border/70 relative border-r p-1 last:border-r-0"
                  data-today={isToday(day) || undefined}
                >
                  {dayAllDayEvents.map((event) => {
                    const eventStart = new Date(event.start);
                    const eventEnd = new Date(event.end);
                    const isFirstDay = isSameDay(day, eventStart);
                    const isLastDay = isSameDay(day, eventEnd);

                    // Check if this is the first day in the current week view
                    const isFirstVisibleDay =
                      dayIndex === 0 && isBefore(eventStart, weekStart);
                    const shouldShowTitle = isFirstDay || isFirstVisibleDay;

                    return (
                      <EventItem
                        key={`spanning-${event.id}`}
                        onClick={(e) => handleEventClick(event, e)}
                        event={event}
                        view="month"
                        isFirstDay={isFirstDay}
                        isLastDay={isLastDay}
                      >
                        {/* Show title if it's the first day of the event or the first visible day in the week */}
                        <div
                          className={cn(
                            "truncate",
                            !shouldShowTitle && "invisible"
                          )}
                          aria-hidden={!shouldShowTitle}
                        >
                          {event.title}
                        </div>
                      </EventItem>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid flex-1 grid-cols-8 overflow-hidden">
        <div className="border-border/70 border-r grid auto-cols-fr">
          {hours.map((hour, index) => (
            <div
              key={hour.toString()}
              className="border-border/70 relative min-h-[var(--week-cells-height)] border-b last:border-b-0"
            >
              {index > 0 && (
                <span className="bg-background text-primary/70 absolute -top-3 left-0 flex h-6 w-16 max-w-full items-center justify-end pe-2 text-[10px] sm:pe-4 sm:text-xs">
                  {format(hour, "h a")}
                </span>
              )}
            </div>
          ))}
        </div>

        {days.map((day, dayIndex) => (
          <DayColumn
            key={day.toString()}
            day={day}
            dayIndex={dayIndex}
            hours={hours}
            timeBounds={timeBounds}
            slotMinutes={slotMinutes}
            processedEvents={processedDayEvents[dayIndex] ?? []}
            currentTimeVisible={currentTimeVisible}
            currentTimePosition={currentTimePosition}
            isSelecting={isSelecting}
            selectionStart={selectionStart}
            selectionEnd={selectionEnd}
            onSelectionStart={(cellStart) => {
              if (!onEventCreate) return;
              setIsSelecting(true);
              setSelectionStart(cellStart);
              setSelectionEnd(cellStart);
            }}
            onSelectionMove={(cellStart) => {
              if (isSelecting) setSelectionEnd(cellStart);
            }}
            onEventClick={handleEventClick}
          />
        ))}
      </div>
    </div>
  );
}

interface DayColumnProps {
  day: Date;
  dayIndex: number;
  hours: Date[];
  timeBounds: { startHour: number; endHour: number };
  slotMinutes: number;
  processedEvents: PositionedEvent[];
  currentTimeVisible: boolean;
  currentTimePosition: number;
  isSelecting: boolean;
  selectionStart: Date | null;
  selectionEnd: Date | null;
  onSelectionStart: (cellStart: Date) => void;
  onSelectionMove: (cellStart: Date) => void;
  onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void;
}

const DayColumn = React.memo(function DayColumn({
  day,
  dayIndex,
  hours,
  timeBounds,
  slotMinutes,
  processedEvents,
  currentTimeVisible,
  currentTimePosition,
  isSelecting,
  selectionStart,
  selectionEnd,
  onSelectionStart,
  onSelectionMove,
  onEventClick,
}: DayColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const { activeEvent } = useCalendarDnd();
  const isDragging = activeEvent !== null;

  const getTimeFromMouseY = useCallback(
    (clientY: number) => {
      if (!columnRef.current) return null;
      const rect = columnRef.current.getBoundingClientRect();
      const y = clientY - rect.top;
      const totalHeight = rect.height;
      const totalHours = timeBounds.endHour - timeBounds.startHour;
      const hourFraction = (y / totalHeight) * totalHours;
      const slotFraction = slotMinutes / 60;
      const snapped = Math.floor(hourFraction / slotFraction) * slotFraction;
      return Math.max(0, Math.min(totalHours - slotFraction, snapped)) + timeBounds.startHour;
    },
    [slotMinutes, timeBounds],
  );

  const getCellDate = useCallback(
    (time: number) => {
      const startTime = new Date(day);
      startTime.setHours(Math.floor(time));
      startTime.setMinutes(Math.round((time % 1) * 60));
      startTime.setSeconds(0);
      startTime.setMilliseconds(0);
      return startTime;
    },
    [day],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (e.target instanceof Element && e.target.closest("[data-calendar-event]")) {
        return;
      }
      const time = getTimeFromMouseY(e.clientY);
      if (time === null) return;
      onSelectionStart(getCellDate(time));
    },
    [getTimeFromMouseY, getCellDate, onSelectionStart],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelecting) return;
      const time = getTimeFromMouseY(e.clientY);
      if (time === null) return;
      onSelectionMove(getCellDate(time));
    },
    [isSelecting, getTimeFromMouseY, getCellDate, onSelectionMove],
  );

  const selectionStyle = useMemo(() => {
    if (!isSelecting || !selectionStart || !selectionEnd) return null;
    if (!isSameDay(day, selectionStart) && !isSameDay(day, selectionEnd)) return null;

    const [start, end] =
      selectionStart <= selectionEnd
        ? [selectionStart, selectionEnd]
        : [selectionEnd, selectionStart];

    if (!isSameDay(day, start) && !isSameDay(day, end)) return null;

    const startHour = getHours(start) + getMinutes(start) / 60;
    const endHour = getHours(end) + getMinutes(end) / 60 + slotMinutes / 60;
    const totalHours = timeBounds.endHour - timeBounds.startHour;

    const top = ((startHour - timeBounds.startHour) / totalHours) * 100;
    const height = ((endHour - startHour) / totalHours) * 100;

    return { top: `${top}%`, height: `${height}%` };
  }, [isSelecting, selectionStart, selectionEnd, day, slotMinutes, timeBounds]);

  return (
    <div
      ref={columnRef}
      className="border-border/70 relative border-r last:border-r-0"
      data-today={isToday(day) || undefined}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
    >
      {/* Selection highlight */}
      {selectionStyle && (
        <div
          className="absolute inset-x-0 z-5 bg-primary/10 pointer-events-none"
          style={selectionStyle}
        />
      )}

      {/* Positioned events */}
      {processedEvents.map((positionedEvent) => (
        <div
          key={positionedEvent.event.id}
          className="absolute z-10 px-0.5"
          style={{
            top: `${positionedEvent.top}px`,
            height: `${positionedEvent.height}px`,
            left: `${positionedEvent.left * 100}%`,
            width: `${positionedEvent.width * 100}%`,
            zIndex: positionedEvent.zIndex,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-full w-full">
            <DraggableEvent
              event={positionedEvent.event}
              view="week"
              onClick={(e) => onEventClick(positionedEvent.event, e)}
              showTime
              height={positionedEvent.height}
            />
          </div>
        </div>
      ))}

      {/* Current time indicator */}
      {currentTimeVisible && isToday(day) && (
        <div
          className="pointer-events-none absolute right-0 left-0 z-20"
          style={{ top: `${currentTimePosition}%` }}
        >
          <div className="relative flex items-center">
            <div className="bg-red-500 absolute -left-1 h-2 w-2 rounded-full"></div>
            <div className="bg-red-500 h-[2px] w-full"></div>
          </div>
        </div>
      )}

      {/* Hour grid lines */}
      {hours.map((hour) => (
        <div
          key={hour.toString()}
          className="border-border/70 min-h-[var(--week-cells-height)] border-b last:border-b-0"
        />
      ))}

      {/* Droppable cells - only mount during drag for DnD targets */}
      {isDragging &&
        hours.map((hour) => {
          const hourValue = getHours(hour);
          const slotsPerHour = 60 / slotMinutes;
          return Array.from({ length: slotsPerHour }, (_, slot) => slot).map((slot) => {
            const slotTime = hourValue + slot * (slotMinutes / 60);
            return (
              <DroppableCell
                key={`${hour.toString()}-${slot}`}
                id={`week-cell-${day.toISOString()}-${slotTime}`}
                date={day}
                time={slotTime}
                className={cn("absolute w-full pointer-events-auto")}
                style={{
                  height: `${100 / ((timeBounds.endHour - timeBounds.startHour) * slotsPerHour)}%`,
                  top: `${((hourValue - timeBounds.startHour) * slotsPerHour + slot) * (100 / ((timeBounds.endHour - timeBounds.startHour) * slotsPerHour))}%`,
                }}
              />
            );
          });
        })}
    </div>
  );
});
