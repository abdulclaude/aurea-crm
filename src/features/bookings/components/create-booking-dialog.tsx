"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";
import { BOOKING_LOCATION_LABELS } from "@/features/bookings/constants";

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBookingDialog({ open, onOpenChange }: CreateBookingDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [eventTypeId, setEventTypeId] = useState("");
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [attendeePhone, setAttendeePhone] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [locationType, setLocationType] = useState("GOOGLE_MEET");
  const [notes, setNotes] = useState("");
  const [syncToCalCom, setSyncToCalCom] = useState(false);
  const [messageDialog, setMessageDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
  }>({ open: false, title: "" });

  // Get event types
  const { data: eventTypes } = useSuspenseQuery(
    trpc.eventTypes.getMany.queryOptions({})
  );

  // Get Cal.com credential to check if sync is available
  const { data: calComCredential } = useSuspenseQuery(
    trpc.calComCredentials.get.queryOptions()
  );
  const { data: stripeConnection } = useSuspenseQuery(
    trpc.stripeConnect.getConnection.queryOptions()
  );

  const createMutation = useMutation(
    trpc.bookings.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.bookings.getMany.queryOptions({}));
        resetForm();
        onOpenChange(false);
      },
    })
  );

  const paymentSessionMutation = useMutation(
    trpc.bookings.createPaymentSession.mutationOptions()
  );

  const resetForm = () => {
    setEventTypeId("");
    setAttendeeName("");
    setAttendeeEmail("");
    setAttendeePhone("");
    setDurationMinutes(null);
    setStartDate("");
    setStartTime("");
    setLocationType("GOOGLE_MEET");
    setNotes("");
    setSyncToCalCom(false);
  };

  const selectedEventType = eventTypes.find((eventType) => eventType.id === eventTypeId);
  const durationOptions =
    selectedEventType?.availableDurations || [];

  const resolvedDuration =
    durationMinutes ??
    durationOptions?.[0] ??
    selectedEventType?.length;

  useEffect(() => {
    if (!selectedEventType) {
      setDurationMinutes(null);
      return;
    }

    if (durationOptions.length > 0) {
      setDurationMinutes(durationOptions[0]);
      return;
    }

    const fallbackDuration = selectedEventType.length ?? null;
    setDurationMinutes(fallbackDuration);
  }, [selectedEventType, durationOptions]);

  const handleCreate = async () => {
    if (!eventTypeId || !attendeeName || !attendeeEmail || !startDate || !startTime) {
      setMessageDialog({
        open: true,
        title: "Missing required fields",
        description: "Please fill in all required fields to create a booking.",
      });
      return;
    }

    if (!selectedEventType) {
      setMessageDialog({
        open: true,
        title: "Event type missing",
        description: "Please select an event type before creating a booking.",
      });
      return;
    }

    if (!resolvedDuration) {
      setMessageDialog({
        open: true,
        title: "Missing duration",
        description: "Please choose a duration before creating a booking.",
      });
      return;
    }

    try {
      setIsLoading(true);
      const startDateTime = new Date(`${startDate}T${startTime}`).toISOString();

      const createdBooking = await createMutation.mutateAsync({
        eventTypeId,
        attendeeName,
        attendeeEmail,
        attendeePhone: attendeePhone || undefined,
        attendeeTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        startTime: startDateTime,
        duration: resolvedDuration,
        locationType: locationType as any,
        additionalNotes: notes || undefined,
        syncToCalCom: syncToCalCom && !!calComCredential,
      });

      if (selectedEventType.requiresPayment) {
        if (!stripeConnection?.isActive) {
          setMessageDialog({
            open: true,
            title: "Stripe not connected",
            description:
              "Connect Stripe for this location to collect booking payments.",
          });
          return;
        }

        const paymentSession = await paymentSessionMutation.mutateAsync({
          bookingId: createdBooking.id,
        });

        if (paymentSession?.url) {
          window.location.href = paymentSession.url;
          return;
        }
      }

      setMessageDialog({
        open: true,
        title: "Booking created",
        description: "The booking has been created successfully.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create booking.";
      console.error("Failed to create booking:", error);
      setMessageDialog({
        open: true,
        title: "Failed to create booking",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Booking</DialogTitle>
          <DialogDescription>
            Schedule a new appointment or booking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
            {/* Event Type */}
            <div className="space-y-2">
              <Label htmlFor="eventType">Event Type *</Label>
              <Select value={eventTypeId} onValueChange={setEventTypeId}>
                <SelectTrigger id="eventType">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((eventType) => (
                    <SelectItem key={eventType.id} value={eventType.id}>
                      {eventType.title} ({eventType.length} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {durationOptions.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duration</Label>
                <Select
                  value={durationMinutes ? String(durationMinutes) : ""}
                  onValueChange={(value) => setDurationMinutes(Number(value))}
                >
                  <SelectTrigger id="durationMinutes">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {durationOptions.map((option: number) => (
                      <SelectItem key={option} value={String(option)}>
                        {option} minutes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Attendee Name */}
            <div className="space-y-2">
              <Label htmlFor="attendeeName">Attendee Name *</Label>
              <Input
                id="attendeeName"
                value={attendeeName}
                onChange={(e) => setAttendeeName(e.target.value)}
                placeholder="John Doe"
              />
            </div>

            {/* Attendee Email */}
            <div className="space-y-2">
              <Label htmlFor="attendeeEmail">Attendee Email *</Label>
              <Input
                id="attendeeEmail"
                type="email"
                value={attendeeEmail}
                onChange={(e) => setAttendeeEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>

            {/* Location Type */}
            <div className="space-y-2">
              <Label htmlFor="locationType">Location Type</Label>
              <Select value={locationType} onValueChange={setLocationType}>
                <SelectTrigger id="locationType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BOOKING_LOCATION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information..."
                rows={3}
              />
            </div>

            {/* Cal.com Sync */}
            {calComCredential && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="syncToCalCom"
                  checked={syncToCalCom}
                  onChange={(e) => setSyncToCalCom(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="syncToCalCom" className="cursor-pointer">
                  Sync to Cal.com
                </Label>
              </div>
            )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      <Dialog
        open={messageDialog.open}
        onOpenChange={(open) =>
          setMessageDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{messageDialog.title}</DialogTitle>
            {messageDialog.description && (
              <DialogDescription>{messageDialog.description}</DialogDescription>
            )}
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
