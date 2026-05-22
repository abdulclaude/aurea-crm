"use client";

import { X } from "lucide-react";
import { useQueryState, parseAsString } from "nuqs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BOOKING_STATUS_LABELS } from "@/features/bookings/constants";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

export function BookingsToolbar() {
  const trpc = useTRPC();
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [status, setStatus] = useQueryState("status", parseAsString);
  const [eventTypeId, setEventTypeId] = useQueryState("eventTypeId", parseAsString);

  // Get event types for filter
  const { data: eventTypes } = useSuspenseQuery(
    trpc.eventTypes.getMany.queryOptions({})
  );

  const hasFilters = !!search || !!status || !!eventTypeId;

  const clearFilters = () => {
    setSearch("");
    setStatus(null);
    setEventTypeId(null);
  };

  return (
    <div className="flex items-center gap-2 p-4">
      <Input
        placeholder="Search bookings..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 w-[200px] lg:w-[300px]"
      />

      <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? null : v)}>
        <SelectTrigger className="h-8 w-[150px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {Object.entries(BOOKING_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={eventTypeId || "all"}
        onValueChange={(v) => setEventTypeId(v === "all" ? null : v)}
      >
        <SelectTrigger className="h-8 w-[180px]">
          <SelectValue placeholder="All event types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All event types</SelectItem>
          {eventTypes.map((eventType) => (
            <SelectItem key={eventType.id} value={eventType.id}>
              {eventType.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          onClick={clearFilters}
          className="h-8 px-2 lg:px-3"
        >
          Clear
          <X className="ml-2 size-3.5" />
        </Button>
      )}
    </div>
  );
}
