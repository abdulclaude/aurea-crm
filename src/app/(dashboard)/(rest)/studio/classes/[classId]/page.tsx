"use client";

import { useState, use } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { IconLoader as LoaderIcon } from "central-icons/IconLoader";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ClassRoomField } from "@/features/studio/components/class-room-field";
import { ClassEditDialog } from "@/features/studio/components/class-edit-dialog";
import { BookingOutcomeConfirmDialog } from "@/features/studio/components/booking-outcome-confirm-dialog";
import { ClassBookingsTable } from "@/features/studio/components/class-bookings-table";
import { ClassDetailActions } from "@/features/studio/components/class-detail-actions";
import type { BookingOutcome } from "@/features/studio/lib/booking-outcome-impact";

type PendingBookingOutcome = {
  bookingIds: string[];
  outcome: BookingOutcome;
};

export default function ClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = use(params);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [bookClientId, setBookClientId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [pendingOutcome, setPendingOutcome] =
    useState<PendingBookingOutcome | null>(null);

  const { data: studioClass, isLoading } = useQuery(
    trpc.studioClassesEnhanced.getById.queryOptions({ classId }),
  );

  const { data: clients } = useQuery({
    ...trpc.clients.list.queryOptions({ search: clientSearch, limit: 10 }),
    enabled: clientSearch.length >= 2,
  });

  const permissions = useQuery(trpc.permissions.getCurrent.queryOptions());
  const canManageAttendance = Boolean(
    permissions.data?.capabilities.includes("attendance.manage"),
  );
  const canManageSchedule = Boolean(
    permissions.data?.capabilities.includes("schedule.manage"),
  );
  const canManageWorkflows = Boolean(
    permissions.data?.capabilities.includes("workflow.manage"),
  );
  const policyPreview = useQuery({
    ...trpc.cancellationPolicy.getOutcomePolicyPreview.queryOptions({
      classId,
    }),
    enabled: canManageAttendance,
  });

  const bookMutation = useMutation(
    trpc.studioBookings.book.mutationOptions({
      onSuccess: (result) => {
        queryClient.invalidateQueries({
          queryKey: trpc.studioClassesEnhanced.getById.queryKey(),
        });
        setBookClientId("");
        setClientSearch("");
        if (result.checkout?.url) {
          window.location.assign(result.checkout.url);
          return;
        }
        toast.success("Booking confirmed");
      },
      onError: (err: { message: string }) => toast.error(err.message),
    }),
  );

  const checkInMutation = useMutation(
    trpc.checkin.manualCheckIn.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.studioClassesEnhanced.getById.queryKey(),
        });
        toast.success("Checked in");
      },
      onError: (err: { message: string }) => toast.error(err.message),
    }),
  );

  const bulkStatusMutation = useMutation(
    trpc.cancellationPolicy.applyBookingOutcome.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: trpc.studioClassesEnhanced.getById.queryKey(),
        });
        setSelectedBookingIds([]);
        setPendingOutcome(null);
        toast.success(
          `${data.updated} booking${data.updated === 1 ? "" : "s"} updated`,
        );
      },
      onError: (err: { message: string }) => toast.error(err.message),
    }),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoaderIcon className="h-6 w-6 animate-spin text-primary/40" />
      </div>
    );
  }

  if (!studioClass) {
    return (
      <div className="p-6">
        <p className="text-sm text-primary/60">Class not found.</p>
      </div>
    );
  }

  const activeBookings = studioClass.studioBooking.filter(
    (b) => b.status !== "CANCELLED" && b.status !== "LATE_CANCEL",
  );
  const bookedCount = activeBookings.length;
  const checkedInCount = studioClass.checkIn.length;
  const checkedInClientIds = new Set(
    studioClass.checkIn.map((c) => c.clientId),
  );
  const isFull =
    studioClass.maxCapacity != null && bookedCount >= studioClass.maxCapacity;
  const capacityPct = studioClass.maxCapacity
    ? Math.round((bookedCount / studioClass.maxCapacity) * 100)
    : null;

  const STATUS_MAP: Record<string, { label: string; className: string }> = {
    SCHEDULED: {
      label: "Scheduled",
      className: "bg-sky-500/15 text-sky-700 ring-sky-500/30 dark:text-sky-200",
    },
    CANCELLED: {
      label: "Cancelled",
      className:
        "bg-rose-500/15 text-rose-700 ring-rose-500/30 dark:text-rose-200",
    },
    COMPLETED: {
      label: "Completed",
      className:
        "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-200",
    },
  };
  const statusInfo = STATUS_MAP[studioClass.status] ?? {
    label: studioClass.status,
    className: "bg-primary/10 text-primary ring-black/10",
  };

  const eligibleBookings = studioClass.studioBooking.filter(
    (booking) =>
      booking.status === "BOOKED" && !checkedInClientIds.has(booking.clientId),
  );
  const eligibleBookingIds = eligibleBookings.map((booking) => booking.id);
  const selectedEligibleBookingIds = selectedBookingIds.filter((id) =>
    eligibleBookingIds.includes(id),
  );
  const selectedClient = clients?.items.find(
    (client) => client.id === bookClientId,
  );
  const pendingBookingNames = pendingOutcome
    ? studioClass.studioBooking
        .filter((booking) => pendingOutcome.bookingIds.includes(booking.id))
        .map(
          (booking) => booking.client.name ?? booking.client.email ?? "Member",
        )
    : [];

  function bulkCheckIn() {
    if (selectedEligibleBookingIds.length === 0) return;
    const bookings = eligibleBookings.filter((booking) =>
      selectedEligibleBookingIds.includes(booking.id),
    );
    bookings.forEach((booking) => {
      checkInMutation.mutate({
        classId,
        clientId: booking.clientId,
        method: "MANUAL",
      });
    });
    setSelectedBookingIds([]);
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex shrink-0 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-primary">
            {studioClass.name}
          </h1>
          {studioClass.description && (
            <p className="text-xs text-primary/50 mt-0.5">
              {studioClass.description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canManageSchedule ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
          ) : null}
          <ClassDetailActions
            canManage={canManageSchedule}
            canManageWorkflows={canManageWorkflows}
            classId={classId}
            className={studioClass.name}
            organizationSlug={studioClass.organizationSlug}
            rows={studioClass.studioBooking.map((booking) => ({
              name: booking.client.name ?? "Member",
              email: booking.client.email,
              phone: booking.client.phone,
              status: booking.status,
            }))}
            startTime={studioClass.startTime}
            status={studioClass.status}
            onEdit={() => setEditOpen(true)}
          />
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* Left sidebar */}
        <div className="w-full shrink-0 border-b border-black/5 dark:border-white/5 lg:w-72 lg:border-r lg:border-b-0 lg:overflow-y-auto">
          <div className="">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 p-5">
              <div className="flex flex-col items-center justify-center rounded-lg bg-primary/3 py-3 px-2 text-center ring ring-black/10">
                <span className="text-base font-semibold text-primary">
                  {bookedCount}
                </span>
                <span className="text-[10px] text-primary/50 mt-0.5">
                  Booked
                </span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/10 py-3 px-2 text-center ring ring-emerald-500/25">
                <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                  {checkedInCount}
                </span>
                <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">
                  Checked in
                </span>
              </div>

              <div className="flex flex-col items-center justify-center rounded-lg bg-primary/3 py-3 px-2 text-center ring ring-black/10">
                <span className="text-base font-semibold text-primary">
                  {studioClass.classWaitlist.length}
                </span>
                <span className="text-[10px] text-primary/50 mt-0.5">
                  Waitlist
                </span>
              </div>
            </div>

            {/* Capacity bar */}
            {studioClass.maxCapacity && (
              <div className="space-y-1.5 p-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-primary/60 font-medium">Capacity</span>
                  <span
                    className={`font-semibold ${capacityPct && capacityPct >= 90 ? "text-red-500" : capacityPct && capacityPct >= 70 ? "text-amber-500" : "text-emerald-500"}`}
                  >
                    {bookedCount} / {studioClass.maxCapacity}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${capacityPct && capacityPct >= 90 ? "bg-red-500" : capacityPct && capacityPct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(capacityPct ?? 0, 100)}%` }}
                  />
                </div>
              </div>
            )}

            <Separator className="bg-black/5 dark:bg-white/5" />

            {/* Class info fields */}
            <div className="space-y-3 p-5">
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2 pb-1">
                  {studioClass.serviceType && (
                    <Badge
                      variant="outline"
                      className="max-w-44 truncate text-[10px] ring-0"
                      style={{
                        backgroundColor: studioClass.serviceType.calendarColor
                          ? `${studioClass.serviceType.calendarColor}18`
                          : undefined,
                        borderColor: studioClass.serviceType.calendarColor
                          ? `${studioClass.serviceType.calendarColor}66`
                          : undefined,
                        boxShadow: studioClass.serviceType.calendarColor
                          ? `0 0 0 1px ${studioClass.serviceType.calendarColor}66`
                          : undefined,
                        color:
                          studioClass.serviceType.calendarColor ?? undefined,
                      }}
                    >
                      {studioClass.serviceType.name}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={cn(
                      "w-fit text-[10px] capitalize",
                      statusInfo.className,
                    )}
                  >
                    {statusInfo.label}
                  </Badge>
                </div>
                <div className="flex items-start gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] text-primary/50">Date</p>
                    <p className="text-xs text-primary font-medium">
                      {format(
                        new Date(studioClass.startTime),
                        "EEEE, MMM d, yyyy",
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] text-primary/50">Time</p>
                    <p className="text-xs text-primary font-medium">
                      {format(new Date(studioClass.startTime), "HH:mm")} -{" "}
                      {format(new Date(studioClass.endTime), "HH:mm")}
                    </p>
                  </div>
                </div>

                {studioClass.instructor && (
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9 shrink-0 overflow-hidden rounded-full">
                      <AvatarImage
                        src={studioClass.instructor.profilePhoto ?? undefined}
                        alt={`${studioClass.instructor.name} profile`}
                        className="size-full object-cover object-center"
                      />
                      <AvatarFallback className="rounded-full text-[10px]">
                        {studioClass.instructor.name.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <p className="text-[11px] text-primary/50">Instructor</p>
                      <p className="text-xs text-primary font-medium">
                        {studioClass.instructor.name}
                      </p>
                    </div>
                  </div>
                )}
                <ClassRoomField
                  classId={studioClass.id}
                  roomId={studioClass.roomId}
                />
                {studioClass.difficulty && (
                  <div className="flex items-start gap-3">
                    <div className="space-y-1">
                      <p className="text-[11px] text-primary/50">Level</p>
                      <p className="text-xs text-primary font-medium capitalize">
                        {studioClass.difficulty.replace("_", " ").toLowerCase()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Book a member */}
            {studioClass.status === "SCHEDULED" && (
              <>
                <Separator className="bg-black/5 dark:bg-white/5" />
                <div className="space-y-3 p-5">
                  <p className="text-xs font-medium text-primary/50">
                    Book a member
                  </p>
                  <Popover open={clientOpen} onOpenChange={setClientOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 w-full justify-start text-left text-xs font-normal"
                      >
                        {selectedClient ? (
                          <span className="truncate">
                            {selectedClient.name}
                          </span>
                        ) : (
                          <span className="text-primary/45">
                            Select a member
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-72 p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Search name or email..."
                          value={clientSearch}
                          onValueChange={setClientSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {clientSearch.length < 2
                              ? "Type at least 2 characters."
                              : "No members found."}
                          </CommandEmpty>
                          <CommandGroup>
                            {(clients?.items ?? []).map((client) => (
                              <CommandItem
                                key={client.id}
                                value={`${client.name} ${client.email ?? ""}`}
                                onSelect={() => {
                                  setBookClientId(client.id);
                                  setClientSearch(
                                    client.name ?? client.email ?? "",
                                  );
                                  setClientOpen(false);
                                }}
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-medium text-primary">
                                    {client.name}
                                  </p>
                                  <p className="truncate text-[10px] text-primary/50">
                                    {client.email ?? "No email"}
                                  </p>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    disabled={!bookClientId || bookMutation.isPending || isFull}
                    onClick={() =>
                      bookMutation.mutate({ classId, clientId: bookClientId })
                    }
                  >
                    {bookMutation.isPending
                      ? "Booking..."
                      : isFull
                        ? "Class is full"
                        : "Book member"}
                  </Button>
                </div>
              </>
            )}

            {/* Waitlist */}
            {studioClass.classWaitlist.length > 0 && (
              <>
                <Separator className="bg-black/5 dark:bg-white/5" />
                <div className="space-y-2 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-primary/50">
                      Waitlist
                    </p>
                    <span className="text-[10px] text-primary/40">
                      {studioClass.classWaitlist.length} waiting
                    </span>
                  </div>
                  <div className="space-y-1">
                    {studioClass.classWaitlist.map((entry, i) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 ring-1 ring-black/5 dark:ring-white/5"
                      >
                        <span className="text-[10px] text-primary/30 w-4 text-right font-semibold">
                          #{i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-primary truncate">
                            {entry.client.name}
                          </p>
                          <p className="text-[10px] text-primary/40 truncate">
                            {entry.client.email}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`px-1.5 text-[9px] shrink-0 ${
                            entry.status === "WAITING"
                              ? "bg-sky-500/15 text-sky-700 ring-sky-500/30 dark:text-sky-200"
                              : entry.status === "NOTIFIED"
                                ? "bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-200"
                                : entry.status === "CANCELLED_WAITLIST" ||
                                    entry.status === "EXPIRED"
                                  ? "bg-rose-500/15 text-rose-700 ring-rose-500/30 dark:text-rose-200"
                                  : "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-200"
                          }`}
                        >
                          {entry.status
                            .replaceAll("_", " ")
                            .toLowerCase()
                            .replace(/^\w/, (letter) => letter.toUpperCase())}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="min-h-[28rem] min-w-0 flex-1 lg:min-h-0 lg:overflow-y-auto">
          <ClassBookingsTable
            bookings={studioClass.studioBooking}
            startTime={studioClass.startTime}
            endTime={studioClass.endTime}
            checkedInClientIds={checkedInClientIds}
            selectedBookingIds={selectedBookingIds}
            canManageAttendance={canManageAttendance}
            checkInPending={checkInMutation.isPending}
            outcomePending={bulkStatusMutation.isPending}
            onSelectedBookingIdsChange={setSelectedBookingIds}
            onNoShow={(bookingIds) =>
              setPendingOutcome({ bookingIds, outcome: "NO_SHOW" })
            }
            onLateCancel={(bookingIds) =>
              setPendingOutcome({ bookingIds, outcome: "LATE_CANCEL" })
            }
            onBulkCheckIn={bulkCheckIn}
          />
        </div>
      </div>
      <ClassEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        studioClass={studioClass}
      />
      <BookingOutcomeConfirmDialog
        bookingNames={pendingBookingNames}
        open={Boolean(pendingOutcome)}
        outcome={pendingOutcome?.outcome ?? "NO_SHOW"}
        pending={bulkStatusMutation.isPending}
        policy={policyPreview.data ?? null}
        policyError={policyPreview.error?.message ?? null}
        policyLoading={policyPreview.isLoading}
        onOpenChange={(open) => !open && setPendingOutcome(null)}
        onConfirm={() => {
          if (!pendingOutcome) return;
          bulkStatusMutation.mutate({
            bookingIds: pendingOutcome.bookingIds,
            status: pendingOutcome.outcome,
          });
        }}
      />
    </div>
  );
}
