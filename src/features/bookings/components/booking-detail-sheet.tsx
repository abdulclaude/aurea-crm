"use client";

import { format } from "date-fns";
import { Calendar, Clock, MapPin, User, Mail, Phone, Building, DollarSign } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BOOKING_STATUS_LABELS, BOOKING_LOCATION_LABELS } from "@/features/bookings/constants";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutput = inferRouterOutputs<AppRouter>;
type BookingRow = RouterOutput["bookings"]["getMany"]["bookings"][number];

interface BookingDetailSheetProps {
  booking: BookingRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  CONFIRMED: "bg-green-500/10 text-green-500 border-green-500/20",
  CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
  RESCHEDULED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  NO_SHOW: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  COMPLETED: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

export function BookingDetailSheet({ booking, open, onOpenChange }: BookingDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{booking.title}</SheetTitle>
          <SheetDescription>Booking details and information</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status */}
          <div>
            <Badge
              variant="outline"
              className={`${statusColors[booking.status] || ""}`}
            >
              {BOOKING_STATUS_LABELS[booking.status] || booking.status}
            </Badge>
          </div>

          <Separator />

          {/* Date & Time */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Calendar className="size-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Date & Time</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(booking.startTime), "EEEE, MMMM d, yyyy")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(booking.startTime), "h:mm a")} - {format(new Date(booking.endTime), "h:mm a")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="size-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Duration</p>
                <p className="text-sm text-muted-foreground">{booking.duration} minutes</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="size-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Location</p>
                <p className="text-sm text-muted-foreground">
                  {BOOKING_LOCATION_LABELS[booking.locationType] || booking.locationType}
                </p>
                {booking.locationValue && (
                  <p className="text-sm text-muted-foreground">{booking.locationValue}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Attendee Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Attendee Information</h3>
            
            <div className="flex items-start gap-3">
              <User className="size-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Name</p>
                <p className="text-sm text-muted-foreground">{booking.attendeeName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="size-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{booking.attendeeEmail}</p>
              </div>
            </div>

            {booking.attendeePhone && (
              <div className="flex items-start gap-3">
                <Phone className="size-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{booking.attendeePhone}</p>
                </div>
              </div>
            )}

            {booking.guests && booking.guests.length > 0 && (
              <div className="flex items-start gap-3">
                <User className="size-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Guests</p>
                  {booking.guests.map((guest, i) => (
                    <p key={i} className="text-sm text-muted-foreground">{guest}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Event Type */}
          {booking.eventType && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Event Type</h3>
                <div className="flex items-start gap-3">
                  <Building className="size-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{booking.eventType.title}</p>
                    {booking.eventType.description && (
                      <p className="text-sm text-muted-foreground">{booking.eventType.description}</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* CRM Links */}
          {(booking.client || booking.deal) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">CRM Links</h3>
                
                {booking.client && (
                  <div>
                    <p className="text-sm font-medium">Client</p>
                    <p className="text-sm text-muted-foreground">{booking.client.name}</p>
                    {booking.client.email && (
                      <p className="text-xs text-muted-foreground">{booking.client.email}</p>
                    )}
                  </div>
                )}

                {booking.deal && (
                  <div>
                    <p className="text-sm font-medium">Deal</p>
                    <p className="text-sm text-muted-foreground">{booking.deal.name}</p>
                    {booking.deal.value && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="size-3" />
                        {Number(booking.deal.value)} {booking.deal.currency || "USD"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Notes */}
          {booking.additionalNotes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {booking.additionalNotes}
                </p>
              </div>
            </>
          )}

          {/* Cancellation Info */}
          {booking.status === "CANCELLED" && booking.cancellationReason && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Cancellation Reason</h3>
                <p className="text-sm text-muted-foreground">{booking.cancellationReason}</p>
                {booking.cancelledAt && (
                  <p className="text-xs text-muted-foreground">
                    Cancelled on {format(new Date(booking.cancelledAt), "PPP")}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Timestamps */}
          <Separator />
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Created {format(new Date(booking.createdAt), "PPP")}
            </p>
            {booking.lastSyncedAt && (
              <p className="text-xs text-muted-foreground">
                Last synced with Cal.com {format(new Date(booking.lastSyncedAt), "PPP")}
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
