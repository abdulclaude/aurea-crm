"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TagsDisplay } from "@/components/ui/tags-input";
import { ClassBookingActions } from "@/features/studio/components/class-booking-actions";
import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutput = inferRouterOutputs<AppRouter>;
type StudioClass = NonNullable<
  RouterOutput["studioClassesEnhanced"]["getById"]
>;
export type ClassBooking = StudioClass["studioBooking"][number];

function getBookingTags(booking: ClassBooking): string[] {
  return [
    ...(booking.client.tags ?? []),
    ...booking.client.studioMemberships
      .filter((membership) => membership.status === "ACTIVE")
      .map((membership) => membership.membershipPlan?.name ?? membership.name),
  ];
}

export function isSelectableBooking(
  booking: ClassBooking,
  checkedInClientIds: ReadonlySet<string>,
): boolean {
  return (
    !checkedInClientIds.has(booking.clientId) &&
    booking.status !== "CANCELLED" &&
    booking.status !== "LATE_CANCEL" &&
    booking.status !== "NO_SHOW"
  );
}

function BookingStatus({
  booking,
  checkedIn,
}: {
  booking: ClassBooking;
  checkedIn: boolean;
}) {
  const status = checkedIn ? "CHECKED_IN" : booking.status;
  const statusStyle: Record<string, { label: string; color: string }> = {
    CHECKED_IN: { label: "Checked in", color: "#059669" },
    BOOKED: { label: "Booked", color: "#0284c7" },
    CANCELLED: { label: "Cancelled", color: "#64748b" },
    LATE_CANCEL: { label: "Late cancel", color: "#d97706" },
    NO_SHOW: { label: "No-show", color: "#e11d48" },
    ATTENDED: { label: "Attended", color: "#059669" },
  };
  const info = statusStyle[status] ?? {
    label: status.replaceAll("_", " "),
    color: "#64748b",
  };
  return (
    <Badge
      variant="outline"
      className="max-w-44 truncate text-[10px] ring-0"
      style={{
        backgroundColor: `${info.color}18`,
        borderColor: `${info.color}66`,
        color: info.color,
        boxShadow: `0 0 0 1px ${info.color}66`,
      }}
    >
      {info.label}
    </Badge>
  );
}

interface ClassBookingsColumnsOptions {
  startTime: Date | string;
  endTime: Date | string;
  checkedInClientIds: ReadonlySet<string>;
  selectedBookingIds: string[];
  eligibleBookingIds: string[];
  onSelectedBookingIdsChange: (ids: string[]) => void;
}

export function createClassBookingsColumns({
  startTime,
  endTime,
  checkedInClientIds,
  selectedBookingIds,
  eligibleBookingIds,
  onSelectedBookingIdsChange,
}: ClassBookingsColumnsOptions): ColumnDef<ClassBooking>[] {
  const allEligibleSelected =
    eligibleBookingIds.length > 0 &&
    eligibleBookingIds.every((id) => selectedBookingIds.includes(id));

  return [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={allEligibleSelected}
          disabled={eligibleBookingIds.length === 0}
          onCheckedChange={(checked) =>
            onSelectedBookingIdsChange(
              checked === true ? eligibleBookingIds : [],
            )
          }
          aria-label="Select all eligible bookings"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedBookingIds.includes(row.original.id)}
          disabled={!isSelectableBooking(row.original, checkedInClientIds)}
          onCheckedChange={(checked) =>
            onSelectedBookingIdsChange(
              checked === true
                ? Array.from(new Set([...selectedBookingIds, row.original.id]))
                : selectedBookingIds.filter((id) => id !== row.original.id),
            )
          }
          aria-label={`Select ${row.original.client.name ?? "member"}`}
        />
      ),
      enableHiding: false,
      enableSorting: false,
    },
    {
      id: "name",
      accessorFn: (booking) => booking.client.name ?? "",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/5 text-[10px] font-semibold text-primary/60">
            {row.original.client.name?.slice(0, 1).toUpperCase() ?? "?"}
          </div>
          <span className="block min-w-0 truncate text-xs font-medium text-primary/75">
            {row.original.client.name}
          </span>
        </div>
      ),
    },
    {
      id: "tags",
      accessorFn: (booking) => getBookingTags(booking).join(" "),
      header: "Tags",
      cell: ({ row }) => (
        <TagsDisplay maxVisible={3} tags={getBookingTags(row.original)} />
      ),
    },
    {
      id: "email",
      accessorFn: (booking) => booking.client.email ?? "",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-xs text-primary/75">
          {row.original.client.email ?? "—"}
        </span>
      ),
    },
    {
      id: "date",
      header: "Date",
      cell: () => (
        <span className="whitespace-nowrap text-xs text-primary/75">
          {format(new Date(startTime), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      id: "start",
      header: "Start time",
      cell: () => (
        <span className="whitespace-nowrap text-xs text-primary/75">
          {format(new Date(startTime), "HH:mm")}
        </span>
      ),
    },
    {
      id: "end",
      header: "End time",
      cell: () => (
        <span className="whitespace-nowrap text-xs text-primary/75">
          {format(new Date(endTime), "HH:mm")}
        </span>
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <BookingStatus
          booking={row.original}
          checkedIn={checkedInClientIds.has(row.original.clientId)}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) => {
        return (
          <ClassBookingActions
            booking={row.original}
            checkedIn={checkedInClientIds.has(row.original.clientId)}
            selected={selectedBookingIds.includes(row.original.id)}
            onSelectedChange={(selected) =>
              onSelectedBookingIdsChange(
                selected
                  ? Array.from(new Set([...selectedBookingIds, row.original.id]))
                  : selectedBookingIds.filter((id) => id !== row.original.id),
              )
            }
          />
        );
      },
    },
  ];
}
