"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import * as React from "react";

import { PageTabs } from "@/components/ui/page-tabs";
import { MemberDataTable } from "./member-data-table";
import type { LifecycleSummary } from "./member-lifecycle-types";
import { MemberStatusBadge } from "./member-status-badge";

type BookingTab = "upcoming" | "history";
type BookingRow = {
  id: string;
  className: string;
  classType: string;
  instructor: string;
  startTime: Date;
  endTime: Date;
  bookedAt: Date | null;
  status: string;
};

const BOOKING_TABS = [
  { id: "upcoming", label: "Upcoming bookings" },
  { id: "history", label: "Booking history" },
] satisfies Array<{ id: BookingTab; label: string }>;

const BOOKING_COLUMN_ORDER = [
  "className",
  "classType",
  "instructor",
  "startTime",
  "bookedAt",
  "status",
];

const bookingColumns: ColumnDef<BookingRow>[] = [
  {
    accessorKey: "className",
    header: "Class",
    meta: { label: "Class" },
    enableHiding: false,
  },
  {
    accessorKey: "classType",
    header: "Class type",
    meta: { label: "Class type" },
  },
  {
    accessorKey: "instructor",
    header: "Instructor",
    meta: { label: "Instructor" },
  },
  {
    accessorKey: "startTime",
    header: "Date and time",
    meta: { label: "Date and time" },
    cell: ({ row }) =>
      `${format(row.original.startTime, "d MMM yyyy, HH:mm")}–${format(row.original.endTime, "HH:mm")}`,
  },
  {
    accessorKey: "bookedAt",
    header: "Booked on",
    meta: { label: "Booked on" },
    cell: ({ row }) =>
      row.original.bookedAt
        ? format(row.original.bookedAt, "d MMM yyyy")
        : "Not recorded",
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => <MemberStatusBadge status={row.original.status} />,
  },
];

function isBookingTab(value: string): value is BookingTab {
  return BOOKING_TABS.some((tab) => tab.id === value);
}

export function MemberBookingsView({ data }: { data: LifecycleSummary }) {
  const [activeTab, setActiveTab] = React.useState<BookingTab>("upcoming");
  const [statuses, setStatuses] = React.useState<string[]>([]);
  const upcomingRows: BookingRow[] = data.upcomingBookings.map((booking) => ({
    id: booking.id,
    className: booking.studioClass.name,
    classType: booking.studioClass.classType?.name ?? "Not set",
    instructor: booking.studioClass.instructor?.name ?? "Not assigned",
    startTime: new Date(booking.studioClass.startTime),
    endTime: new Date(booking.studioClass.endTime),
    bookedAt: booking.bookedAt ? new Date(booking.bookedAt) : null,
    status: booking.status,
  }));
  const historyRows: BookingRow[] = data.recentBookings.map((booking) => ({
    id: booking.id,
    className: booking.studioClass.name,
    classType: booking.studioClass.classType?.name ?? "Not set",
    instructor: booking.studioClass.instructor?.name ?? "Not assigned",
    startTime: new Date(booking.studioClass.startTime),
    endTime: new Date(booking.studioClass.endTime),
    bookedAt: booking.bookedAt ? new Date(booking.bookedAt) : null,
    status: booking.checkedInAt ? "ATTENDED" : booking.status,
  }));
  const rows = activeTab === "upcoming" ? upcomingRows : historyRows;
  const visibleRows = statuses.length
    ? rows.filter((booking) => statuses.includes(booking.status))
    : rows;
  const statusOptions = Array.from(new Set(rows.map((row) => row.status))).map(
    (status) => ({ value: status, label: status.replaceAll("_", " ") }),
  );

  return (
    <div className="space-y-4">
      <PageTabs
        tabs={BOOKING_TABS}
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (isBookingTab(tab)) {
            setActiveTab(tab);
            setStatuses([]);
          }
        }}
        className="px-4 sm:px-6"
      />
      <MemberDataTable
        columns={bookingColumns}
        data={visibleRows}
        getRowId={(booking) => booking.id}
        initialColumnOrder={BOOKING_COLUMN_ORDER}
        primaryColumnId="className"
        searchPlaceholder="Search bookings..."
        emptyLabel={
          activeTab === "upcoming"
            ? "No upcoming bookings."
            : "No booking history."
        }
        filterGroups={[
          {
            label: "Status",
            options: statusOptions,
            selectedValues: statuses,
            onChange: setStatuses,
          },
        ]}
      />
    </div>
  );
}
