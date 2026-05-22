"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import type { CalendarEvent, CalendarView, EventColor } from "@/features/rotas/components/event-calendar";
import { EventCalendar } from "@/features/rotas/components/event-calendar";
import { CalendarContext } from "@/features/rotas/components/event-calendar/calendar-context";
import { useTRPC } from "@/trpc/client";
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BookingCalendarProps {
  eventTypeId?: string;
  initialView?: CalendarView;
  onSelectSlot?: (start: Date, end: Date) => void;
  mode?: "select" | "manage";
  className?: string;
}

const statusColors: Record<string, EventColor> = {
  CONFIRMED: "emerald",
  PENDING: "orange",
  RESCHEDULED: "violet",
  CANCELLED: "rose",
  NO_SHOW: "rose",
  COMPLETED: "blue",
};

export function BookingCalendar({
  eventTypeId,
  initialView = "week",
  onSelectSlot,
  mode = "manage",
  className,
}: BookingCalendarProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>(initialView);
  const [createMode, setCreateMode] = useState<"availability" | "holiday">("availability");
  const [selectedEvent, setSelectedEvent] = useState<{
    id: string;
    type: "booking" | "availability" | "holiday";
    title: string;
    start: Date;
    end: Date;
  } | null>(null);
  const [pendingTitleTouched, setPendingTitleTouched] = useState(false);
  const [pendingStartInput, setPendingStartInput] = useState("");
  const [pendingEndInput, setPendingEndInput] = useState("");
  const [pendingSelection, setPendingSelection] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
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

  const { data } = useSuspenseQuery(
    trpc.bookings.getCalendar.queryOptions({
      startDate: range.start,
      endDate: range.end,
      eventTypeId: eventTypeId || undefined,
    })
  );

  const createAvailabilityMutation = useMutation(
    trpc.bookings.createAvailabilityBlock.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.bookings.getCalendar.queryOptions({
          startDate: range.start,
          endDate: range.end,
          eventTypeId: eventTypeId || undefined,
        }));
      },
    })
  );

  const updateAvailabilityMutation = useMutation(
    trpc.bookings.updateAvailabilityBlock.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.bookings.getCalendar.queryOptions({
          startDate: range.start,
          endDate: range.end,
          eventTypeId: eventTypeId || undefined,
        }));
      },
    })
  );

  const deleteAvailabilityMutation = useMutation(
    trpc.bookings.deleteAvailabilityBlock.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.bookings.getCalendar.queryOptions({
          startDate: range.start,
          endDate: range.end,
          eventTypeId: eventTypeId || undefined,
        }));
      },
    })
  );

  const createHolidayMutation = useMutation(
    trpc.bookings.createHoliday.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.bookings.getCalendar.queryOptions({
          startDate: range.start,
          endDate: range.end,
          eventTypeId: eventTypeId || undefined,
        }));
      },
    })
  );

  const updateHolidayMutation = useMutation(
    trpc.bookings.updateHoliday.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.bookings.getCalendar.queryOptions({
          startDate: range.start,
          endDate: range.end,
          eventTypeId: eventTypeId || undefined,
        }));
      },
    })
  );

  const deleteHolidayMutation = useMutation(
    trpc.bookings.deleteHoliday.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.bookings.getCalendar.queryOptions({
          startDate: range.start,
          endDate: range.end,
          eventTypeId: eventTypeId || undefined,
        }));
      },
    })
  );

  const events = useMemo<CalendarEvent[]>(() => {
    const bookingEvents = data.bookings.map((booking) => ({
      id: `booking:${booking.id}`,
      title: booking.title,
      description: `${booking.attendeeName} • ${booking.attendeeEmail}`,
      start: new Date(booking.startTime),
      end: new Date(booking.endTime),
      color: statusColors[booking.status] || "blue",
      label: booking.eventTypeTitle,
    }));

    const availabilityEvents = data.availabilityBlocks.map((block) => ({
      id: `availability:${block.id}`,
      title: block.title || "Availability",
      description: "Available",
      start: new Date(block.startTime),
      end: new Date(block.endTime),
      color: "violet" as EventColor,
      label: "Availability",
    }));

    const holidayEvents = data.holidayBlocks.map((block) => ({
      id: `holiday:${block.id}`,
      title: block.name || "Holiday",
      description: "Holiday",
      start: startOfDay(new Date(block.startDate)),
      end: endOfDay(new Date(block.endDate)),
      allDay: true,
      color: "rose" as EventColor,
      label: "Holiday",
    }));

    return [...bookingEvents, ...availabilityEvents, ...holidayEvents];
  }, [data]);

  const timeBounds = useMemo(() => {
    if (events.length === 0) {
      return { startHour: 7, endHour: 24 };
    }

    let earliestHour = 23;
    events.forEach((event) => {
      const startHour = event.start.getHours();
      earliestHour = Math.min(earliestHour, startHour);
    });

    return {
      startHour: Math.max(0, earliestHour - 1),
      endHour: 24,
    };
  }, [events]);

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
      <div className={className}>
        <EventCalendar
          events={events}
          onEventAdd={(event) => {
            if (mode === "select") {
              const selectionStart = event.start;
              const selectionEnd = event.end;
              const hasBlockedOverlap = [
                ...data.availabilityBlocks.map((block) => ({
                  type: "availability",
                  start: new Date(block.startTime),
                  end: new Date(block.endTime),
                })),
                ...data.holidayBlocks.map((block) => ({
                  type: "holiday",
                  start: startOfDay(new Date(block.startDate)),
                  end: endOfDay(new Date(block.endDate)),
                })),
              ].some((block) => selectionStart < block.end && selectionEnd > block.start);

              if (hasBlockedOverlap) {
                setBlockedMessage(
                  "That time falls within a blocked availability or holiday window."
                );
                return;
              }

              onSelectSlot?.(selectionStart, selectionEnd);
              return;
            }
            setPendingSelection({ start: event.start, end: event.end });
            setCreateMode("availability");
            setEventTitle("Availability");
            setPendingTitleTouched(false);
            setPendingStartInput(format(event.start, "yyyy-MM-dd'T'HH:mm"));
            setPendingEndInput(format(event.end, "yyyy-MM-dd'T'HH:mm"));
          }}
          onEventUpdate={(event) => {
            if (mode !== "manage") {
              return;
            }

            if (event.id.startsWith("availability:")) {
              updateAvailabilityMutation.mutate({
                id: event.id.replace("availability:", ""),
                title: event.title,
                startTime: event.start,
                endTime: event.end,
              });
              return;
            }

            if (event.id.startsWith("holiday:")) {
              updateHolidayMutation.mutate({
                id: event.id.replace("holiday:", ""),
                name: event.title,
                startDate: startOfDay(event.start),
                endDate: endOfDay(event.end),
              });
            }
          }}
          onEventSelect={(event) => {
            if (event.id.startsWith("booking:")) {
              setSelectedEvent({
                id: event.id.replace("booking:", ""),
                type: "booking",
                title: event.title,
                start: event.start,
                end: event.end,
              });
              setEventTitle(event.title);
              return;
            }

            if (event.id.startsWith("availability:")) {
              setSelectedEvent({
                id: event.id.replace("availability:", ""),
                type: "availability",
                title: event.title,
                start: event.start,
                end: event.end,
              });
              setEventTitle(event.title);
              return;
            }

            if (event.id.startsWith("holiday:")) {
              setSelectedEvent({
                id: event.id.replace("holiday:", ""),
                type: "holiday",
                title: event.title,
                start: event.start,
                end: event.end,
              });
              setEventTitle(event.title);
            }
          }}
          onViewChange={setView}
          initialView={initialView}
          timeBounds={timeBounds}
        />
      </div>

      <Dialog
        open={!!selectedEvent}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEvent(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedEvent?.type === "booking"
                ? "Booking details"
                : selectedEvent?.type === "holiday"
                  ? "Holiday"
                  : "Availability block"}
            </DialogTitle>
          </DialogHeader>

          {selectedEvent && selectedEvent.type !== "booking" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">Title</span>
                <Input
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedEvent.start.toLocaleString()} → {selectedEvent.end.toLocaleString()}
              </div>
            </div>
          )}

          {selectedEvent && selectedEvent.type === "booking" && (
            <div className="space-y-2 text-xs text-muted-foreground">
              <div>{selectedEvent.title}</div>
              <div>
                {selectedEvent.start.toLocaleString()} → {selectedEvent.end.toLocaleString()}
              </div>
              <div>Bookings can’t be edited from the calendar yet.</div>
            </div>
          )}

          {selectedEvent && selectedEvent.type !== "booking" && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!selectedEvent) {
                    return;
                  }
                  if (selectedEvent.type === "availability") {
                    await deleteAvailabilityMutation.mutateAsync({
                      id: selectedEvent.id,
                    });
                  }
                  if (selectedEvent.type === "holiday") {
                    await deleteHolidayMutation.mutateAsync({
                      id: selectedEvent.id,
                    });
                  }
                  setSelectedEvent(null);
                }}
              >
                Delete
              </Button>
              <Button
                onClick={async () => {
                  if (!selectedEvent) {
                    return;
                  }
                  if (selectedEvent.type === "availability") {
                    await updateAvailabilityMutation.mutateAsync({
                      id: selectedEvent.id,
                      title: eventTitle,
                      startTime: selectedEvent.start,
                      endTime: selectedEvent.end,
                    });
                  }
                  if (selectedEvent.type === "holiday") {
                    await updateHolidayMutation.mutateAsync({
                      id: selectedEvent.id,
                      name: eventTitle,
                      startDate: startOfDay(selectedEvent.start),
                      endDate: endOfDay(selectedEvent.end),
                    });
                  }
                  setSelectedEvent(null);
                }}
              >
                Save
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!pendingSelection}
        onOpenChange={(open) => {
          if (!open) {
            setPendingSelection(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create block</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {pendingSelection && (
              <div className="rounded-lg border border-black/5 px-3 py-2 text-xs text-muted-foreground dark:border-white/10">
                {format(pendingSelection.start, "EEE, MMM d • h:mm a")} —{" "}
                {format(pendingSelection.end, "h:mm a")}
              </div>
            )}
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Block type</span>
              <Select
                value={createMode}
                onValueChange={(value) => {
                  const nextMode = value as "availability" | "holiday";
                  setCreateMode(nextMode);
                  if (!pendingTitleTouched) {
                    setEventTitle(nextMode === "holiday" ? "Holiday" : "Availability");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="availability">Availability</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Title</span>
              <Input
                value={eventTitle}
                onChange={(e) => {
                  setEventTitle(e.target.value);
                  setPendingTitleTouched(true);
                }}
                placeholder={createMode === "holiday" ? "Holiday" : "Availability"}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">Start</span>
                <Input
                  type="datetime-local"
                  value={pendingStartInput}
                  onChange={(e) => setPendingStartInput(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground">End</span>
                <Input
                  type="datetime-local"
                  value={pendingEndInput}
                  onChange={(e) => setPendingEndInput(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingSelection(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!pendingSelection) {
                  return;
                }
                const start = pendingStartInput
                  ? new Date(pendingStartInput)
                  : pendingSelection.start;
                const end = pendingEndInput
                  ? new Date(pendingEndInput)
                  : pendingSelection.end;
                if (createMode === "holiday") {
                  const holidayStart = startOfDay(start);
                  const holidayEnd = endOfDay(end);
                  await createHolidayMutation.mutateAsync({
                    name: eventTitle || "Holiday",
                    startDate: holidayStart,
                    endDate: holidayEnd,
                  });
                } else {
                  await createAvailabilityMutation.mutateAsync({
                    title: eventTitle || undefined,
                    startTime: start,
                    endTime: end,
                  });
                }
                setEventTitle("");
                setPendingTitleTouched(false);
                setPendingStartInput("");
                setPendingEndInput("");
                setPendingSelection(null);
              }}
            >
              Save block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!blockedMessage}
        onOpenChange={(open) => {
          if (!open) {
            setBlockedMessage(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Time unavailable</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">{blockedMessage}</div>
          <DialogFooter>
            <Button onClick={() => setBlockedMessage(null)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CalendarContext.Provider>
  );
}
