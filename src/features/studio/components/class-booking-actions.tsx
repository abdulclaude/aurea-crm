"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CalendarSync,
  CheckSquare,
  CreditCard,
  Mail,
  MessageSquare,
  MoreHorizontal,
  NotebookPen,
  Phone,
  RotateCcw,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ClassBooking } from "@/features/studio/components/class-bookings-columns";
import { useTRPC } from "@/trpc/client";

type BookingAction = "cancel" | "delete" | "note" | "checkin-note" | "switch" | "activity" | null;

export function ClassBookingActions({
  booking,
  checkedIn,
  selected,
  onSelectedChange,
}: {
  booking: ClassBooking;
  checkedIn: boolean;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [action, setAction] = React.useState<BookingAction>(null);
  const [note, setNote] = React.useState("");
  const [targetClassId, setTargetClassId] = React.useState("");
  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: trpc.studioClassesEnhanced.getById.queryKey({ classId: booking.classId }),
    });
  };
  const close = () => {
    setAction(null);
    setNote("");
    setTargetClassId("");
  };
  const mutationOptions = (success: string) => ({
    onSuccess: async () => {
      await refresh();
      close();
      toast.success(success);
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const cancelBooking = useMutation(
    trpc.studioBookings.cancel.mutationOptions(mutationOptions("Booking cancelled")),
  );
  const deleteBooking = useMutation(
    trpc.studioBookings.delete.mutationOptions(mutationOptions("Booking deleted")),
  );
  const reverseCheckIn = useMutation(
    trpc.studioBookings.reverseCheckIn.mutationOptions(mutationOptions("Check-in reversed")),
  );
  const updateNote = useMutation(
    trpc.studioBookings.updateNote.mutationOptions(mutationOptions("Note added")),
  );
  const switchClass = useMutation(
    trpc.studioBookings.switchClass.mutationOptions(mutationOptions("Reservation moved")),
  );
  const classesQuery = useQuery({
    ...trpc.studioClassesEnhanced.list.queryOptions({
      page: 1,
      pageSize: 100,
      startDate: new Date().toISOString(),
      status: "SCHEDULED",
    }),
    enabled: action === "switch",
  });
  const activityQuery = useQuery({
    ...trpc.activity.getByEntity.queryOptions({
      entityType: "studio_booking",
      entityId: booking.id,
      limit: 50,
    }),
    enabled: action === "activity",
  });
  const clientUrl = `/members/${booking.clientId}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <span className="sr-only">Open reservation actions</span>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="text-[10px] uppercase text-primary/45">Customer</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href={clientUrl} className="cursor-pointer text-xs">
                <UserRound className="size-3.5" /> Visit client profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`${clientUrl}?tab=payments`} className="cursor-pointer text-xs">
                <CreditCard className="size-3.5" /> Update payment method
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[10px] uppercase text-primary/45">Reservation</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem className="cursor-pointer text-xs" onSelect={() => onSelectedChange(!selected)}>
              <CheckSquare className="size-3.5" /> Select reservation
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-xs"
              disabled={!checkedIn || reverseCheckIn.isPending}
              onSelect={() => reverseCheckIn.mutate({ bookingId: booking.id })}
            >
              <RotateCcw className="size-3.5" /> Reverse check in
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-xs" onSelect={() => setAction("switch")}>
              <CalendarSync className="size-3.5" /> Switch class
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-xs" onSelect={() => setAction("cancel")}>
              <XCircle className="size-3.5" /> Cancel booking
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-xs text-destructive focus:text-destructive" onSelect={() => setAction("delete")}>
              <Trash2 className="size-3.5" /> Delete booking
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[10px] uppercase text-primary/45">Notes and history</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem className="cursor-pointer text-xs" onSelect={() => setAction("note")}>
              <NotebookPen className="size-3.5" /> Add session note
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-xs" onSelect={() => setAction("checkin-note")}>
              <NotebookPen className="size-3.5" /> Add check-in note
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-xs" onSelect={() => setAction("activity")}>
              <Activity className="size-3.5" /> Activity log
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[10px] uppercase text-primary/45">Contact</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem asChild disabled={!booking.client.email}>
              <a
                href={booking.client.email ? `mailto:${booking.client.email}` : undefined}
                className="flex min-w-0 cursor-pointer flex-nowrap text-xs"
                title={booking.client.email ?? undefined}
              >
                <Mail className="size-3.5 shrink-0" />
                <span className="shrink-0">Email</span>
                <span className="min-w-0 truncate">
                  {booking.client.email ?? "unavailable"}
                </span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild disabled={!booking.client.phone}>
              <a href={booking.client.phone ? `sms:${booking.client.phone}` : undefined} className="cursor-pointer text-xs">
                <MessageSquare className="size-3.5" /> Text {booking.client.phone ?? "unavailable"}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild disabled={!booking.client.phone}>
              <a href={booking.client.phone ? `tel:${booking.client.phone}` : undefined} className="cursor-pointer text-xs">
                <Phone className="size-3.5" /> Call {booking.client.phone ?? "unavailable"}
              </a>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={action === "cancel" || action === "delete"} onOpenChange={(open) => !open && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{action === "cancel" ? "Cancel booking?" : "Delete booking?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {action === "cancel"
                ? "Cancellation rules and any applicable late-cancel policy will be applied."
                : "Only an already-cancelled booking can be deleted. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction onClick={() => action === "cancel" ? cancelBooking.mutate({ bookingId: booking.id }) : deleteBooking.mutate({ bookingId: booking.id })}>
              {action === "cancel" ? "Cancel booking" : "Delete booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={action === "note" || action === "checkin-note"} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{action === "note" ? "Add session note" : "Add check-in note"}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`booking-note-${booking.id}`}>Note</Label>
            <Textarea id={`booking-note-${booking.id}`} value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button disabled={!note.trim() || updateNote.isPending} onClick={() => updateNote.mutate({ bookingId: booking.id, kind: action === "note" ? "SESSION" : "CHECK_IN", note })}>Add note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action === "switch"} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Switch class</DialogTitle></DialogHeader>
          <Select value={targetClassId} onValueChange={setTargetClassId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select a scheduled class" /></SelectTrigger>
            <SelectContent>
              {(classesQuery.data?.classes ?? []).filter((item) => item.id !== booking.classId).map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name} - {new Date(item.startTime).toLocaleString("en-GB")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button disabled={!targetClassId || switchClass.isPending} onClick={() => switchClass.mutate({ bookingId: booking.id, targetClassId })}>Switch class</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action === "activity"} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reservation activity</DialogTitle></DialogHeader>
          <div className="max-h-[55vh] divide-y divide-black/5 overflow-y-auto dark:divide-white/5">
            {(activityQuery.data ?? []).length === 0 ? (
              <p className="py-8 text-center text-xs text-primary/50">No recorded activity yet.</p>
            ) : (activityQuery.data ?? []).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 py-3 text-xs">
                <span>{entry.action.toLowerCase().replaceAll("_", " ")}</span>
                <time className="text-primary/45">{new Date(entry.createdAt).toLocaleString("en-GB")}</time>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
