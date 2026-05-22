"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addHours,
  addMinutes,
  areIntervalsOverlapping,
  differenceInMinutes,
  eachHourOfInterval,
  format,
  getHours,
  getMinutes,
  isSameDay,
  startOfDay,
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
import { StartHour, EndHour } from "@/features/rotas/components/event-calendar/constants";
import { cn } from "@/lib/utils";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventSelect: (event: CalendarEvent) => void;
  onEventCreate?: (startTime: Date, endTime?: Date) => void;
  timeBounds?: { startHour: number; endHour: number };
}

interface PositionedEvent {
  event: CalendarEvent;
  top: number;
  height: number;
  left: number;
  width: number;
  zIndex: number;
}

export function DayView({
  currentDate,
  events,
  onEventSelect,
  onEventCreate,
  timeBounds = { startHour: StartHour, endHour: EndHour },
}: DayViewProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Date | null>(null);
  const hours = useMemo(() => {
    const dayStart = startOfDay(currentDate);
    return eachHourOfInterval({
      start: addHours(dayStart, timeBounds.startHour),
      end: addHours(dayStart, timeBounds.endHour - 1),
    });
  }, [currentDate, timeBounds]);

  const dayEvents = useMemo(() => {
    return events
      .filter((event) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return (
          isSameDay(currentDate, eventStart) ||
          isSameDay(currentDate, eventEnd) ||
          (currentDate > eventStart && currentDate < eventEnd)
        );
      })
      .sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      );
  }, [currentDate, events]);

  // Filter all-day events
  const allDayEvents = useMemo(() => {
    return dayEvents.filter((event) => {
      // Include explicitly marked all-day events or multi-day events
      return event.allDay || isMultiDayEvent(event);
    });
  }, [dayEvents]);

  // Get only single-day time-based events
  const timeEvents = useMemo(() => {
    return dayEvents.filter((event) => {
      // Exclude all-day events and multi-day events
      return !event.allDay && !isMultiDayEvent(event);
    });
  }, [dayEvents]);

  // Process events to calculate positions
  const positionedEvents = useMemo(() => {
    const dayStart = startOfDay(currentDate);

    // Sort events by start time and duration
    const sortedEvents = [...timeEvents].sort((a, b) => {
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

    // Build event metadata with adjusted times
    const eventMetadata = sortedEvents.map((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      // Adjust start and end times if they're outside this day
      const adjustedStart = isSameDay(currentDate, eventStart)
        ? eventStart
        : dayStart;
      const adjustedEnd = isSameDay(currentDate, eventEnd)
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
    const columns: typeof eventMetadata[] = [];

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
              { start: other.adjustedStart, end: other.adjustedEnd },
            ),
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
    eventMetadata.forEach((meta) => {
      // Find all events that overlap with this one
      const overlappingEvents = eventMetadata.filter((other) =>
        areIntervalsOverlapping(
          { start: meta.adjustedStart, end: meta.adjustedEnd },
          { start: other.adjustedStart, end: other.adjustedEnd },
        ),
      );
      // The max column is the highest column index among overlapping events + 1
      meta.maxColumns = Math.max(
        ...overlappingEvents.map((e) => e.column + 1),
      );
    });

    // Create positioned events with proper widths
    const result: PositionedEvent[] = eventMetadata.map((meta) => {
      // Each event takes equal width within its overlapping group
      const width = 1 / meta.maxColumns;
      const left = meta.column / meta.maxColumns;

      return {
        event: meta.event,
        top: meta.top,
        height: meta.height,
        left,
        width,
        zIndex: 10 + meta.column,
      };
    });

    return result;
  }, [currentDate, timeEvents]);

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    onEventSelect(event);
  };

  const showAllDaySection = allDayEvents.length > 0;
  const { currentTimePosition, currentTimeVisible } = useCurrentTimeIndicator(
    currentDate,
    "day",
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
      const endWithBuffer = addMinutes(end, isSingleSlot ? 60 : 15);

      onEventCreate?.(start, endWithBuffer);
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [isSelecting, selectionStart, selectionEnd, onEventCreate]);

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
      const quarter = Math.floor(hourFraction * 4) / 4;
      return Math.max(0, Math.min(totalHours - 0.25, quarter)) + timeBounds.startHour;
    },
    [timeBounds],
  );

  const getCellDate = useCallback(
    (time: number) => {
      const startTime = new Date(currentDate);
      startTime.setHours(Math.floor(time));
      startTime.setMinutes(Math.round((time % 1) * 60));
      startTime.setSeconds(0);
      startTime.setMilliseconds(0);
      return startTime;
    },
    [currentDate],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!onEventCreate) return;
      if (e.button !== 0) return;
      const time = getTimeFromMouseY(e.clientY);
      if (time === null) return;
      const cellStart = getCellDate(time);
      setIsSelecting(true);
      setSelectionStart(cellStart);
      setSelectionEnd(cellStart);
    },
    [getTimeFromMouseY, getCellDate, onEventCreate],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelecting) return;
      const time = getTimeFromMouseY(e.clientY);
      if (time === null) return;
      setSelectionEnd(getCellDate(time));
    },
    [isSelecting, getTimeFromMouseY, getCellDate],
  );

  const selectionStyle = useMemo(() => {
    if (!isSelecting || !selectionStart || !selectionEnd) return null;

    const [start, end] =
      selectionStart <= selectionEnd
        ? [selectionStart, selectionEnd]
        : [selectionEnd, selectionStart];

    const startHour = getHours(start) + getMinutes(start) / 60;
    const endHour = getHours(end) + getMinutes(end) / 60 + 0.25;
    const totalHours = timeBounds.endHour - timeBounds.startHour;

    const top = ((startHour - timeBounds.startHour) / totalHours) * 100;
    const height = ((endHour - startHour) / totalHours) * 100;

    return { top: `${top}%`, height: `${height}%` };
  }, [isSelecting, selectionStart, selectionEnd, timeBounds]);

  return (
    <div data-slot="day-view" className="contents">
      {showAllDaySection && (
        <div className="border-border/70 bg-muted/50 border-t">
          <div className="grid grid-cols-[3rem_1fr] sm:grid-cols-[4rem_1fr]">
            <div className="relative">
              <span className="text-muted-foreground/70 absolute bottom-0 left-0 h-6 w-16 max-w-full pe-2 text-right text-[10px] sm:pe-4 sm:text-xs">
                All day
              </span>
            </div>
            <div className="border-border/70 relative border-r p-1 last:border-r-0">
              {allDayEvents.map((event) => {
                const eventStart = new Date(event.start);
                const eventEnd = new Date(event.end);
                const isFirstDay = isSameDay(currentDate, eventStart);
                const isLastDay = isSameDay(currentDate, eventEnd);

                return (
                  <EventItem
                    key={`spanning-${event.id}`}
                    onClick={(e) => handleEventClick(event, e)}
                    event={event}
                    view="month"
                    isFirstDay={isFirstDay}
                    isLastDay={isLastDay}
                  >
                    {/* Always show the title in day view for better usability */}
                    <div>{event.title}</div>
                  </EventItem>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="border-border/70 grid flex-1 grid-cols-[3rem_1fr] border-t sm:grid-cols-[4rem_1fr] overflow-hidden">
        <div>
          {hours.map((hour, index) => (
            <div
              key={hour.toString()}
              className="border-border/70 relative h-[var(--week-cells-height)] border-b last:border-b-0"
            >
              {index > 0 && (
                <span className="bg-background text-muted-foreground/70 absolute -top-3 left-0 flex h-6 w-16 max-w-full items-center justify-end pe-2 text-[10px] sm:pe-4 sm:text-xs">
                  {format(hour, "h a")}
                </span>
              )}
            </div>
          ))}
        </div>

        <div
          ref={columnRef}
          className="relative"
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
          {positionedEvents.map((positionedEvent) => (
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
                  view="day"
                  onClick={(e) => handleEventClick(positionedEvent.event, e)}
                  showTime
                  height={positionedEvent.height}
                />
              </div>
            </div>
          ))}

          {/* Current time indicator */}
          {currentTimeVisible && (
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
              className="border-border/70 h-[var(--week-cells-height)] border-b last:border-b-0"
            />
          ))}

          {/* Droppable cells - only mount during drag */}
          {isDragging &&
            hours.map((hour) => {
              const hourValue = getHours(hour);
              return [0, 1, 2, 3].map((quarter) => {
                const quarterHourTime = hourValue + quarter * 0.25;
                return (
                  <DroppableCell
                    key={`${hour.toString()}-${quarter}`}
                    id={`day-cell-${currentDate.toISOString()}-${quarterHourTime}`}
                    date={currentDate}
                    time={quarterHourTime}
                    className="absolute w-full h-[calc(var(--week-cells-height)/4)] pointer-events-auto"
                    style={{
                      top: `${((hourValue - timeBounds.startHour) * 4 + quarter) * (100 / ((timeBounds.endHour - timeBounds.startHour) * 4))}%`,
                    }}
                  />
                );
              });
            })}
        </div>
      </div>
    </div>
  );
}
