"use client";

import { Mail, MessageSquare, Search, Users } from "lucide-react";
import * as React from "react";

import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createClassBookingsColumns,
  type ClassBooking,
  isSelectableBooking,
} from "@/features/studio/components/class-bookings-columns";

interface ClassBookingsTableProps {
  bookings: ClassBooking[];
  startTime: Date | string;
  endTime: Date | string;
  checkedInClientIds: ReadonlySet<string>;
  selectedBookingIds: string[];
  canManageAttendance: boolean;
  checkInPending: boolean;
  outcomePending: boolean;
  onSelectedBookingIdsChange: (ids: string[]) => void;
  onNoShow: (bookingIds: string[]) => void;
  onLateCancel: (bookingIds: string[]) => void;
  onBulkCheckIn: () => void;
}

const COLUMN_ORDER = [
  "select",
  "name",
  "tags",
  "email",
  "date",
  "start",
  "end",
  "status",
  "actions",
];

export function ClassBookingsTable({
  bookings,
  startTime,
  endTime,
  checkedInClientIds,
  selectedBookingIds,
  canManageAttendance,
  checkInPending,
  outcomePending,
  onSelectedBookingIdsChange,
  onNoShow,
  onLateCancel,
  onBulkCheckIn,
}: ClassBookingsTableProps) {
  const [search, setSearch] = React.useState("");
  const eligibleBookingIds = React.useMemo(
    () =>
      bookings
        .filter((booking) => isSelectableBooking(booking, checkedInClientIds))
        .map((booking) => booking.id),
    [bookings, checkedInClientIds],
  );
  const selectedEligibleIds = selectedBookingIds.filter((id) =>
    eligibleBookingIds.includes(id),
  );
  const selectedBookings = bookings.filter((booking) =>
    selectedEligibleIds.includes(booking.id),
  );
  const filteredBookings = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return bookings;
    return bookings.filter(
      (booking) =>
        booking.client.name?.toLowerCase().includes(query) ||
        booking.client.email?.toLowerCase().includes(query),
    );
  }, [bookings, search]);

  const columns = React.useMemo(
    () =>
      createClassBookingsColumns({
        startTime,
        endTime,
        checkedInClientIds,
        selectedBookingIds,
        eligibleBookingIds,
        onSelectedBookingIdsChange,
      }),
    [
      checkedInClientIds,
      eligibleBookingIds,
      endTime,
      onSelectedBookingIdsChange,
      selectedBookingIds,
      startTime,
    ],
  );

  return (
    <DataTable
      columns={columns}
      data={filteredBookings}
      getRowId={(booking) => booking.id}
      initialColumnOrder={COLUMN_ORDER}
      enableGlobalSearch={false}
      toolbar={{
        filters: () => (
          <div className="flex w-full flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-primary/40" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search members..."
                className="h-8 pl-8 text-xs"
              />
            </div>
            {selectedEligibleIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <Badge variant="secondary" className="h-7 text-xs">
                  {selectedEligibleIds.length} selected
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={!selectedBookings.some((booking) => booking.client.email)}
                  onClick={() => {
                    const recipients = selectedBookings
                      .map((booking) => booking.client.email)
                      .filter((email): email is string => Boolean(email));
                    window.location.href = `mailto:?bcc=${encodeURIComponent(recipients.join(","))}`;
                  }}
                >
                  <Mail className="size-3.5" /> Email clients
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={!selectedBookings.some((booking) => booking.client.phone)}
                  onClick={() => {
                    const recipients = selectedBookings
                      .map((booking) => booking.client.phone)
                      .filter((phone): phone is string => Boolean(phone));
                    window.location.href = `sms:?addresses=${encodeURIComponent(recipients.join(","))}`;
                  }}
                >
                  <MessageSquare className="size-3.5" /> Text clients
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={checkInPending}
                  onClick={onBulkCheckIn}
                >
                  Bulk check in
                </Button>
                {canManageAttendance && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={outcomePending}
                      onClick={() => onNoShow(selectedEligibleIds)}
                    >
                      Bulk no-show
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={outcomePending}
                      onClick={() => onLateCancel(selectedEligibleIds)}
                    >
                      Bulk late cancel
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        ),
      }}
      emptyState={
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="mb-3 size-8 text-primary/15" />
          <p className="text-sm font-medium text-primary">
            {search ? "No members match your search" : "No bookings yet"}
          </p>
          <p className="mt-1 text-xs text-primary/50">
            {search
              ? "Try a different name or email"
              : "Bookings will appear here once made"}
          </p>
        </div>
      }
    />
  );
}
