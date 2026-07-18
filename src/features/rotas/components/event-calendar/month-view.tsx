"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DraggableEvent,
  DroppableCell,
  EventGap,
  EventHeight,
  EventItem,
  useCalendarDnd,
  sortEvents,
  useEventVisibility,
  type CalendarEvent,
} from "@/features/rotas/components/event-calendar";
import { DefaultStartHour } from "@/features/rotas/components/event-calendar/constants";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventSelect: (event: CalendarEvent) => void;
  onEventCreate?: (startTime: Date, endTime?: Date) => void;
  weekStartsOn?: 0 | 1 | 6;
}

type MonthDayEvents = {
  dayEvents: CalendarEvent[];
  spanningEvents: CalendarEvent[];
  allEvents: CalendarEvent[];
};

function dayKey(day: Date): string {
  return format(day, "yyyy-MM-dd");
}

function eventSpansDay(event: CalendarEvent, day: Date): boolean {
  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);
  return (
    isSameDay(day, eventStart) ||
    isSameDay(day, eventEnd) ||
    (day > eventStart && day < eventEnd)
  );
}

function isSpanningDay(event: CalendarEvent, day: Date): boolean {
  if (!event.allDay && isSameDay(new Date(event.start), new Date(event.end))) {
    return false;
  }

  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);
  return (
    !isSameDay(day, eventStart) &&
    (isSameDay(day, eventEnd) || (day > eventStart && day < eventEnd))
  );
}

function MonthCellContainer({
  useDroppableCell,
  cellId,
  day,
  onEventCreate,
  children,
}: {
  useDroppableCell: boolean;
  cellId: string;
  day: Date;
  onEventCreate?: (startTime: Date, endTime?: Date) => void;
  children: React.ReactNode;
}) {
  if (useDroppableCell) {
    return (
      <DroppableCell
        id={cellId}
        date={day}
        onClick={
          onEventCreate
            ? () => {
                const startTime = new Date(day);
                startTime.setHours(DefaultStartHour, 0, 0);
                onEventCreate(startTime);
              }
            : undefined
        }
      >
        {children}
      </DroppableCell>
    );
  }

  return (
    <div className="flex h-full flex-col px-0.5 py-1 sm:px-1">
      {children}
    </div>
  );
}

export function MonthView({
  currentDate,
  events,
  onEventSelect,
  onEventCreate,
  weekStartsOn = 1,
}: MonthViewProps) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate, weekStartsOn]);

  const weekdays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(startOfWeek(new Date(), { weekStartsOn }), i);
      return format(date, "EEE");
    });
  }, [weekStartsOn]);

  const weeks = useMemo(() => {
    const result = [];
    let week = [];

    for (let i = 0; i < days.length; i++) {
      week.push(days[i]);
      if (week.length === 7 || i === days.length - 1) {
        result.push(week);
        week = [];
      }
    }

    return result;
  }, [days]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, MonthDayEvents>();

    for (const day of days) {
      map.set(dayKey(day), {
        dayEvents: [],
        spanningEvents: [],
        allEvents: [],
      });
    }

    for (const event of events) {
      for (const day of days) {
        if (!eventSpansDay(event, day)) continue;

        const bucket = map.get(dayKey(day));
        if (!bucket) continue;

        bucket.allEvents.push(event);
        if (isSpanningDay(event, day)) {
          bucket.spanningEvents.push(event);
        } else if (isSameDay(day, new Date(event.start))) {
          bucket.dayEvents.push(event);
        }
      }
    }

    for (const bucket of map.values()) {
      bucket.dayEvents = sortEvents(bucket.dayEvents);
      bucket.spanningEvents = sortEvents(bucket.spanningEvents);
      bucket.allEvents = sortEvents(bucket.allEvents);
    }

    return map;
  }, [days, events]);

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    onEventSelect(event);
  };

  const [isMounted, setIsMounted] = useState(false);
  const { activeEvent } = useCalendarDnd();
  const { contentRef, getVisibleEventCount } = useEventVisibility({
    eventHeight: EventHeight,
    eventGap: EventGap,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div data-slot="month-view" className="contents">
      <div className="border-border/70 grid grid-cols-7 border-y uppercase">
        {weekdays.map((day) => (
          <div key={day} className="text-primary/70 py-2 text-center text-xs">
            {day}
          </div>
        ))}
      </div>

      <div className="grid flex-1 auto-rows-fr">
        {weeks.map((week, weekIndex) => (
          <div
            key={`week-${weekIndex}`}
            className="grid grid-cols-7 [&:last-child>*]:border-b-0"
          >
            {week.map((day, dayIndex) => {
              if (!day) return null; // Skip if day is undefined

              const eventBucket = eventsByDay.get(dayKey(day));
              const dayEvents = eventBucket?.dayEvents ?? [];
              const spanningEvents = eventBucket?.spanningEvents ?? [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const cellId = `month-cell-${day.toISOString()}`;
              const allDayEvents = [...spanningEvents, ...dayEvents];
              const allEvents = eventBucket?.allEvents ?? [];
              const useDroppableCell = activeEvent !== null || !!onEventCreate;

              const isReferenceCell = weekIndex === 0 && dayIndex === 0;
              const visibleCount = isMounted
                ? getVisibleEventCount(allDayEvents.length)
                : undefined;
              const hasMore =
                visibleCount !== undefined &&
                allDayEvents.length > visibleCount;
              const remainingCount = hasMore
                ? allDayEvents.length - visibleCount
                : 0;

              return (
                <div
                  key={day.toString()}
                  className="group border-border/70 data-outside-cell:bg-muted/25 data-outside-cell:text-muted-foreground/70 border-r border-b last:border-r-0"
                  data-today={isToday(day) || undefined}
                  data-outside-cell={!isCurrentMonth || undefined}
                >
                  <MonthCellContainer
                    useDroppableCell={useDroppableCell}
                    cellId={cellId}
                    day={day}
                    onEventCreate={onEventCreate}
                  >
                    <div className="group-data-today:bg-primary group-data-today:text-primary-foreground mt-1 inline-flex size-6 items-center justify-center rounded-full text-sm">
                      {format(day, "d")}
                    </div>
                    <div
                      ref={isReferenceCell ? contentRef : null}
                      className="min-h-[calc((var(--event-height)+var(--event-gap))*2)] sm:min-h-[calc((var(--event-height)+var(--event-gap))*3)] lg:min-h-[calc((var(--event-height)+var(--event-gap))*4)]"
                    >
                      {allDayEvents.map((event, index) => {
                        const eventStart = new Date(event.start);
                        const eventEnd = new Date(event.end);
                        const isFirstDay = isSameDay(day, eventStart);
                        const isLastDay = isSameDay(day, eventEnd);

                        const isHidden =
                          isMounted && visibleCount && index >= visibleCount;

                        if (!visibleCount) return null;

                        if (!isFirstDay) {
                          return (
                            <div
                              key={`spanning-${event.id}-${day
                                .toISOString()
                                .slice(0, 10)}`}
                              className="aria-hidden:hidden"
                              aria-hidden={isHidden ? "true" : undefined}
                            >
                              <EventItem
                                onClick={(e) => handleEventClick(event, e)}
                                event={event}
                                view="month"
                                isFirstDay={isFirstDay}
                                isLastDay={isLastDay}
                              >
                                <div className="invisible" aria-hidden={true}>
                                  {!event.allDay && (
                                    <span>
                                      {format(
                                        new Date(event.start),
                                        "h:mm",
                                      )}{" "}
                                    </span>
                                  )}
                                  {event.title}
                                </div>
                              </EventItem>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={event.id}
                            className="aria-hidden:hidden"
                            aria-hidden={isHidden ? "true" : undefined}
                          >
                            <DraggableEvent
                              event={event}
                              view="month"
                              onClick={(e) => handleEventClick(event, e)}
                              isFirstDay={isFirstDay}
                              isLastDay={isLastDay}
                            />
                          </div>
                        );
                      })}

                      {hasMore && (
                        <Popover modal>
                          <PopoverTrigger asChild>
                            <button
                              className="focus-visible:border-ring focus-visible:ring-ring/50 text-muted-foreground hover:text-black hover:bg-muted/50 mt-[var(--event-gap)] flex h-[var(--event-height)] w-full items-center overflow-hidden px-1 text-left text-[10px] transition outline-none select-none focus-visible:ring-[3px] sm:px-2 sm:text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>
                                + {remainingCount}{" "}
                                <span className="max-sm:sr-only">more</span>
                              </span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="center"
                            className="max-w-52 p-3"
                            style={
                              {
                                "--event-height": `${EventHeight}px`,
                              } as React.CSSProperties
                            }
                          >
                            <div className="space-y-2">
                              <div className="text-sm font-medium">
                                {format(day, "EEE d")}
                              </div>
                              <div className="space-y-1">
                                {allEvents.map((event) => {
                                  const eventStart = new Date(event.start);
                                  const eventEnd = new Date(event.end);
                                  const isFirstDay = isSameDay(day, eventStart);
                                  const isLastDay = isSameDay(day, eventEnd);

                                  return (
                                    <EventItem
                                      key={event.id}
                                      onClick={(e) =>
                                        handleEventClick(event, e)
                                      }
                                      event={event}
                                      view="month"
                                      isFirstDay={isFirstDay}
                                      isLastDay={isLastDay}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </MonthCellContainer>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
