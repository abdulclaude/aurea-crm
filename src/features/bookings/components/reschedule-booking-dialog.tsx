"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutput = inferRouterOutputs<AppRouter>;
type BookingRow = RouterOutput["bookings"]["getMany"]["bookings"][number];

interface RescheduleBookingDialogProps {
  booking: BookingRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RescheduleBookingDialog({ booking, open, onOpenChange }: RescheduleBookingDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [newDate, setNewDate] = useState(format(new Date(booking.startTime), "yyyy-MM-dd"));
  const [newTime, setNewTime] = useState(format(new Date(booking.startTime), "HH:mm"));
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const rescheduleMutation = useMutation(
    trpc.bookings.reschedule.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.bookings.getMany.queryOptions({}));
        onOpenChange(false);
      },
    })
  );

  const handleReschedule = async () => {
    try {
      setIsLoading(true);
      const newStartTime = new Date(`${newDate}T${newTime}`).toISOString();
      
      await rescheduleMutation.mutateAsync({
        id: booking.id,
        newStartTime,
        reason: reason || undefined,
        syncToCalCom: !!booking.calBookingUid,
      });
    } catch (error) {
      console.error("Failed to reschedule booking:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule Booking</DialogTitle>
          <DialogDescription>
            Change the date and time for this booking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="current-time">Current Time</Label>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="size-4" />
              {format(new Date(booking.startTime), "PPP 'at' p")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-date">New Date</Label>
              <Input
                id="new-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-time">New Time</Label>
              <Input
                id="new-time"
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Why is this booking being rescheduled?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleReschedule} disabled={isLoading}>
            {isLoading ? "Rescheduling..." : "Reschedule Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
