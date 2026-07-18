"use client";

import { useMemo } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { differenceInMinutes, format, isPast } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getBorderRadiusClasses,
  getEventColorClasses,
  type CalendarEvent,
} from "@/features/rotas/components/event-calendar";
import { cn } from "@/lib/utils";

const formatCalendarTime = (date: Date) => format(date, "H:mm");

function EventMetadata({ event }: { event: CalendarEvent }) {
  if (!event.person) return null;

  return (
    <div className="mt-1 flex min-w-0 items-center overflow-hidden text-[9px] font-normal opacity-85">
      {event.person && (
        <span className="flex w-full min-w-0 items-center gap-1 truncate">
          <Avatar className="size-4 shrink-0 overflow-hidden rounded-full">
            <AvatarImage
              src={event.person.imageUrl ?? undefined}
              alt={`${event.person.name} profile`}
              className="size-full object-cover object-center"
            />
            <AvatarFallback className="rounded-full text-[8px]">
              {event.person.name.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{event.person.name}</span>
        </span>
      )}
    </div>
  );
}

interface EventWrapperProps {
  event: CalendarEvent;
  isFirstDay?: boolean;
  isLastDay?: boolean;
  isDragging?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  children: React.ReactNode;
  currentTime?: Date;
  dndListeners?: SyntheticListenerMap;
  dndAttributes?: DraggableAttributes;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
}

// Shared wrapper component for event styling
function EventWrapper({
  event,
  isFirstDay = true,
  isLastDay = true,
  isDragging,
  onClick,
  className,
  children,
  currentTime,
  dndListeners,
  dndAttributes,
  onMouseDown,
  onTouchStart,
}: EventWrapperProps) {
  // Always use the currentTime (if provided) to determine if the event is in the past
  const displayEnd = currentTime
    ? new Date(
        new Date(currentTime).getTime() +
          (new Date(event.end).getTime() - new Date(event.start).getTime()),
      )
    : new Date(event.end);

  const isEventInPast = isPast(displayEnd);

  return (
    <button
      data-calendar-event="true"
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 flex h-full w-full overflow-hidden px-1 text-left font-medium transition outline-none select-none focus-visible:ring-[3px] data-dragging:cursor-grabbing data-dragging:shadow-lg data-past-event:opacity-60 data-past-event:line-through sm:px-2",
        getEventColorClasses(event.color),
        getBorderRadiusClasses(isFirstDay, isLastDay),
        className,
      )}
      data-dragging={isDragging || undefined}
      data-past-event={isEventInPast || undefined}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      {...dndListeners}
      {...dndAttributes}
    >
      {children}
    </button>
  );
}

interface EventItemProps {
  event: CalendarEvent;
  view: "month" | "week" | "day" | "agenda";
  isDragging?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  showTime?: boolean;
  currentTime?: Date; // For updating time during drag
  isFirstDay?: boolean;
  isLastDay?: boolean;
  children?: React.ReactNode;
  className?: string;
  dndListeners?: SyntheticListenerMap;
  dndAttributes?: DraggableAttributes;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
}

export function EventItem({
  event,
  view,
  isDragging,
  onClick,
  showTime,
  currentTime,
  isFirstDay = true,
  isLastDay = true,
  children,
  className,
  dndListeners,
  dndAttributes,
  onMouseDown,
  onTouchStart,
}: EventItemProps) {
  const eventColor = event.color;

  // Use the provided currentTime (for dragging) or the event's actual time
  const displayStart = useMemo(() => {
    return currentTime || new Date(event.start);
  }, [currentTime, event.start]);

  const displayEnd = useMemo(() => {
    return currentTime
      ? new Date(
          new Date(currentTime).getTime() +
            (new Date(event.end).getTime() - new Date(event.start).getTime()),
        )
      : new Date(event.end);
  }, [currentTime, event.start, event.end]);

  // Calculate event duration in minutes
  const durationMinutes = useMemo(() => {
    return differenceInMinutes(displayEnd, displayStart);
  }, [displayStart, displayEnd]);

  const getEventTime = () => {
    if (event.allDay) return "All day";

    // For short events (less than 45 minutes), only show start time
    if (durationMinutes < 45) {
      return formatCalendarTime(displayStart);
    }

    // For longer events, show both start and end time
    return `${formatCalendarTime(displayStart)} - ${formatCalendarTime(displayEnd)}`;
  };

  if (view === "month") {
    return (
      <EventWrapper
        event={event}
        isFirstDay={isFirstDay}
        isLastDay={isLastDay}
        isDragging={isDragging}
        onClick={onClick}
        className={cn(
          "mt-[var(--event-gap)] h-[var(--event-height)] items-center text-[10px] sm:text-[13px]",
          className,
        )}
        currentTime={currentTime}
        dndListeners={dndListeners}
        dndAttributes={dndAttributes}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {children || (
          <span className="truncate">
            {!event.allDay && (
              <span className="truncate sm:text-xs font-normal opacity-70 uppercase">
                {formatCalendarTime(displayStart)}{" "}
              </span>
            )}
            {event.title}
          </span>
        )}
      </EventWrapper>
    );
  }

  if (view === "week" || view === "day") {
    return (
      <EventWrapper
        event={event}
        isFirstDay={isFirstDay}
        isLastDay={isLastDay}
        isDragging={isDragging}
        onClick={onClick}
        className={cn(
          "p-1.5",
          durationMinutes < 45 ? "items-center" : "flex-col",
          view === "week" ? "text-[10px] sm:text-[13px]" : "text-[13px]",
          className,
        )}
        currentTime={currentTime}
        dndListeners={dndListeners}
        dndAttributes={dndAttributes}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {durationMinutes < 45 ? (
          <div className="truncate">
            {event.title}{" "}
            {showTime && (
              <span className="opacity-70">
                {formatCalendarTime(displayStart)}
              </span>
            )}
          </div>
        ) : (
          <>
            <div className="flex min-w-0 items-start justify-between gap-1">
              <div className="min-w-0 truncate font-medium">{event.title}</div>
              {event.attendance && (
                <span
                  className="shrink-0 text-[9px] font-normal tabular-nums opacity-75"
                  aria-label={`${event.attendance.booked} booked out of ${event.attendance.capacity ?? "unlimited"}`}
                >
                  {event.attendance.booked}/{event.attendance.capacity ?? "∞"}
                </span>
              )}
            </div>
            {showTime && (
              <div className="truncate text-[9px] font-normal tabular-nums opacity-70">
                {getEventTime()}
              </div>
            )}
            <EventMetadata event={event} />
          </>
        )}
      </EventWrapper>
    );
  }

  // Agenda view - kept separate since it's significantly different
  return (
    <button
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 flex w-full flex-col gap-1 rounded p-2 text-left transition outline-none focus-visible:ring-[3px] data-past-event:line-through data-past-event:opacity-90",
        getEventColorClasses(eventColor),
        className,
      )}
      data-past-event={isPast(new Date(event.end)) || undefined}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      {...dndListeners}
      {...dndAttributes}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 truncate text-sm font-medium">{event.title}</div>
        {event.attendance && (
          <span
            className="shrink-0 text-[10px] tabular-nums opacity-75"
            aria-label={`${event.attendance.booked} booked out of ${event.attendance.capacity ?? "unlimited"}`}
          >
            {event.attendance.booked}/{event.attendance.capacity ?? "∞"}
          </span>
        )}
      </div>
      <div className="text-xs opacity-70">
        {event.allDay ? (
          <span>All day</span>
        ) : (
          <span className="tabular-nums">
            {formatCalendarTime(displayStart)} -{" "}
            {formatCalendarTime(displayEnd)}
          </span>
        )}
        {event.location && (
          <>
            <span className="px-1 opacity-35"> · </span>
            <span>{event.location}</span>
          </>
        )}
      </div>
      {event.description && (
        <div className="my-1 text-xs opacity-90">{event.description}</div>
      )}
      <EventMetadata event={event} />
    </button>
  );
}
