"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { MoreHorizontal, Eye, Calendar, XCircle } from "lucide-react";
import * as React from "react";
import { useQueryState, parseAsString } from "nuqs";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BOOKING_STATUS_LABELS, BOOKING_LOCATION_LABELS } from "@/features/bookings/constants";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { BookingsToolbar } from "./bookings-toolbar";
import { BookingDetailSheet } from "./booking-detail-sheet";
import { RescheduleBookingDialog } from "./reschedule-booking-dialog";

type RouterOutput = inferRouterOutputs<AppRouter>;
type BookingRow = RouterOutput["bookings"]["getMany"]["bookings"][number];

const SORTABLE_COLUMNS = new Set(["startTime", "createdAt"]);

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  CONFIRMED: "bg-green-500/10 text-green-500 border-green-500/20",
  CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
  RESCHEDULED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  NO_SHOW: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  COMPLETED: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

interface BookingsTableProps {
  scope?: "agency" | "all-clients";
}

export function BookingsTable({ scope = "agency" }: BookingsTableProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [status, setStatus] = useQueryState("status", parseAsString);
  const [eventTypeId, setEventTypeId] = useQueryState("eventTypeId", parseAsString);
  const [selectedBooking, setSelectedBooking] = React.useState<BookingRow | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = React.useState<BookingRow | null>(null);
  const [cancelBooking, setCancelBooking] = React.useState<BookingRow | null>(null);

  const { data } = useSuspenseQuery(
    trpc.bookings.getMany.queryOptions({
      search: search || undefined,
      status: status ? (status as any) : undefined,
      eventTypeId: eventTypeId || undefined,
    })
  );

  const cancelMutation = useMutation(
    trpc.bookings.cancel.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.bookings.getMany.queryOptions({
          search: search || undefined,
          status: status ? (status as any) : undefined,
          eventTypeId: eventTypeId || undefined,
        }));
      },
    })
  );

  const handleCancelBooking = async (booking: BookingRow) => {
    await cancelMutation.mutateAsync({
      id: booking.id,
      syncToCalCom: !!booking.calBookingUid,
    });
  };

  const bookingColumns: ColumnDef<BookingRow>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "title",
      accessorKey: "title",
      header: "Booking",
      enableHiding: false,
      cell: ({ row }) => {
        const booking = row.original;
        return (
          <div className="min-w-0">
            <p className="text-xs font-medium text-primary dark:text-white truncate">
              {booking.title}
            </p>
            <p className="text-[11px] text-primary/60 dark:text-white/50 truncate">
              {booking.attendeeName} • {booking.attendeeEmail}
            </p>
          </div>
        );
      },
    },
    {
      id: "eventType",
      accessorFn: (row) => row.eventType?.title,
      header: "Event type",
      cell: ({ row }) => (
        <span className="text-xs text-primary dark:text-white/80">
          {row.original.eventType?.title ?? "—"}
        </span>
      ),
    },
    {
      id: "startTime",
      accessorKey: "startTime",
      header: "Date & Time",
      enableSorting: true,
      cell: ({ row }) => {
        const booking = row.original;
        return (
          <div className="text-xs">
            <p className="text-primary dark:text-white">
              {format(new Date(booking.startTime), "MMM d, yyyy")}
            </p>
            <p className="text-primary/60 dark:text-white/50 text-[11px]">
              {format(new Date(booking.startTime), "h:mm a")} - {format(new Date(booking.endTime), "h:mm a")}
            </p>
          </div>
        );
      },
    },
    {
      id: "duration",
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }) => (
        <span className="text-xs text-primary dark:text-white/80">
          {row.original.duration} min
        </span>
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge
            variant="outline"
            className={`text-[11px] ${statusColors[status] || ""}`}
          >
            {BOOKING_STATUS_LABELS[status] || status}
          </Badge>
        );
      },
    },
    {
      id: "location",
      accessorKey: "locationType",
      header: "Location",
      cell: ({ row }) => (
        <span className="text-xs text-primary dark:text-white/80">
          {BOOKING_LOCATION_LABELS[row.original.locationType] || "—"}
        </span>
      ),
    },
    {
      id: "client",
      accessorFn: (row) => row.client?.name,
      header: "Client",
      cell: ({ row }) => (
        <span className="text-xs text-primary dark:text-white/80">
          {row.original.client?.name ?? "—"}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const booking = row.original;
        const canReschedule = booking.status === "CONFIRMED" || booking.status === "PENDING";
        const canCancel = booking.status === "CONFIRMED" || booking.status === "PENDING";

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" className="size-7 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSelectedBooking(booking)}>
                <Eye className="mr-2 size-3.5" />
                View details
              </DropdownMenuItem>
              {canReschedule && (
                <DropdownMenuItem onClick={() => setRescheduleBooking(booking)}>
                  <Calendar className="mr-2 size-3.5" />
                  Reschedule
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {canCancel && (
                <DropdownMenuItem
                  onClick={() => setCancelBooking(booking)}
                  className="text-red-600"
                >
                  <XCircle className="mr-2 size-3.5" />
                  Cancel booking
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      <BookingsToolbar />
      <DataTable
        columns={bookingColumns}
        data={data.bookings}
        onRowClick={(booking) => setSelectedBooking(booking)}
      />

      {selectedBooking && (
        <BookingDetailSheet
          booking={selectedBooking}
          open={!!selectedBooking}
          onOpenChange={(open) => !open && setSelectedBooking(null)}
        />
      )}

      {rescheduleBooking && (
        <RescheduleBookingDialog
          booking={rescheduleBooking}
          open={!!rescheduleBooking}
          onOpenChange={(open) => !open && setRescheduleBooking(null)}
        />
      )}

      <AlertDialog open={!!cancelBooking} onOpenChange={(open) => !open && setCancelBooking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the booking and sync the cancellation to Cal.com if it was linked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!cancelBooking) {
                  return;
                }
                await handleCancelBooking(cancelBooking);
                setCancelBooking(null);
              }}
            >
              Cancel booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
