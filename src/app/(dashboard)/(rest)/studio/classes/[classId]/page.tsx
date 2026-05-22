"use client";

import { useState, use } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { IconLoader as LoaderIcon } from "central-icons/IconLoader";
import {
  Calendar,
  Users,
  UserCheck,
  UserX,
  Search,
  Plus,
  Dumbbell,
  ListOrdered,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ClassRoomField } from "@/features/studio/components/class-room-field";

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
  const [bookingSearch, setBookingSearch] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);

  const { data: studioClass, isLoading } = useQuery(
    trpc.studioClassesEnhanced.getById.queryOptions({ classId }),
  );

  const { data: clients } = useQuery({
    ...trpc.clients.list.queryOptions({ search: clientSearch, limit: 10 }),
    enabled: clientSearch.length >= 2,
  });

  const bookMutation = useMutation(
    trpc.studioBookings.book.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.studioClassesEnhanced.getById.queryKey(),
        });
        setBookClientId("");
        setClientSearch("");
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
    trpc.studioBookings.bulkUpdateStatus.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: trpc.studioClassesEnhanced.getById.queryKey(),
        });
        setSelectedBookingIds([]);
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
      className: "text-sky-600 ring-sky-300 bg-sky-100 dark:border-sky-800",
    },
    CANCELLED: {
      label: "Cancelled",
      className: "text-rose-600 ring-rose-300 bg-rose-100 dark:border-rose-800",
    },
    COMPLETED: {
      label: "Completed",
      className:
        "text-emerald-600 ring-emerald-300 bg-emerald-100 dark:border-emerald-800",
    },
  };
  const statusInfo = STATUS_MAP[studioClass.status] ?? {
    label: studioClass.status,
    className: "text-gray-600 ring-gray-300 bg-gray-100 dark:border-gray-700",
  };

  const filteredBookings = studioClass.studioBooking.filter((b) => {
    if (!bookingSearch.trim()) return true;
    const q = bookingSearch.toLowerCase();
    return (
      b.client.name?.toLowerCase().includes(q) ||
      b.client.email?.toLowerCase().includes(q)
    );
  });
  const eligibleBookings = filteredBookings.filter(
    (booking) =>
      booking.status === "BOOKED" && !checkedInClientIds.has(booking.clientId),
  );
  const eligibleBookingIds = eligibleBookings.map((booking) => booking.id);
  const selectedEligibleBookingIds = selectedBookingIds.filter((id) =>
    eligibleBookingIds.includes(id),
  );
  const allEligibleSelected =
    eligibleBookingIds.length > 0 &&
    eligibleBookingIds.every((id) => selectedBookingIds.includes(id));
  const selectedClient = clients?.items.find(
    (client) => client.id === bookClientId,
  );

  function toggleBookingSelection(bookingId: string, checked: boolean) {
    setSelectedBookingIds((current) =>
      checked
        ? Array.from(new Set([...current, bookingId]))
        : current.filter((id) => id !== bookingId),
    );
  }

  function toggleAllEligible(checked: boolean) {
    setSelectedBookingIds(checked ? eligibleBookingIds : []);
  }

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
      <div className="flex items-end justify-between gap-3 px-6 py-4 shrink-0">
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

        <div className="flex items-center gap-2 shrink-0">
          {studioClass.classType && (
            <Badge
              variant="outline"
              className="text-[11px] w-fit capitalize"
              style={{
                backgroundColor: studioClass.classType.color
                  ? `${studioClass.classType.color}20`
                  : undefined,
                color: studioClass.classType.color ?? undefined,
                borderColor: studioClass.classType.color
                  ? `${studioClass.classType.color}40`
                  : undefined,
                boxShadow: studioClass.classType.color
                  ? `0 0 0 1px ${studioClass.classType.color}30`
                  : undefined,
              }}
            >
              {studioClass.classType.name}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={cn("text-[11px] w-fit capitalize", statusInfo.className)}
          >
            {statusInfo.label}
          </Badge>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-72 shrink-0 border-r border-black/5 dark:border-white/5 overflow-y-auto">
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
                      {format(new Date(studioClass.startTime), "h:mm a")} –{" "}
                      {format(new Date(studioClass.endTime), "h:mm a")}
                    </p>
                  </div>
                </div>

                {studioClass.instructor && (
                  <div className="flex items-start gap-3">
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
                <div className="space-y-2">
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
                        className="flex items-center gap-2.5 py-1.5"
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
                          className={`text-[9px] px-1.5 shrink-0 ${
                            entry.status === "WAITING"
                              ? "text-blue-600 border-blue-200 dark:border-blue-800"
                              : entry.status === "NOTIFIED"
                                ? "text-amber-600 border-amber-200 dark:border-amber-800"
                                : "text-emerald-600 border-emerald-200 dark:border-emerald-800"
                          }`}
                        >
                          {entry.status.charAt(0) +
                            entry.status.slice(1).toLowerCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main: Bookings table */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Table toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-black/5 dark:border-white/5 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <ListOrdered className="size-4 text-primary/40" />
              <span className="text-sm font-medium text-primary">Bookings</span>
              <span className="text-xs text-primary/40">
                / {studioClass.studioBooking.length} total
              </span>

              {selectedEligibleBookingIds.length > 0 && (
                <div className="ml-2 flex flex-wrap items-center gap-1">
                  <Badge
                    variant="secondary"
                    className="text-xs h-7 rounded-md ring ring-black/10"
                  >
                    {selectedEligibleBookingIds.length} selected
                  </Badge>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={checkInMutation.isPending}
                    onClick={bulkCheckIn}
                  >
                    Bulk approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={bulkStatusMutation.isPending}
                    onClick={() =>
                      bulkStatusMutation.mutate({
                        bookingIds: selectedEligibleBookingIds,
                        status: "NO_SHOW",
                      })
                    }
                  >
                    Bulk no-show
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={bulkStatusMutation.isPending}
                    onClick={() =>
                      bulkStatusMutation.mutate({
                        bookingIds: selectedEligibleBookingIds,
                        status: "LATE_CANCEL",
                      })
                    }
                  >
                    Bulk late cancel
                  </Button>
                </div>
              )}
            </div>
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-primary/40 z-10" />
              <Input
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                placeholder="Search members..."
                className="pl-8 text-xs h-8"
              />
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            {filteredBookings.length > 0 ? (
              <table className="w-full">
                <thead className="sticky top-0 bg-background z-10 border-b border-black/5 dark:border-white/5">
                  <tr>
                    <th className="px-5 py-2.5 text-left w-8">
                      <Checkbox
                        checked={allEligibleSelected}
                        disabled={eligibleBookingIds.length === 0}
                        onCheckedChange={(checked) =>
                          toggleAllEligible(checked === true)
                        }
                        aria-label="Select all eligible bookings"
                      />
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-normal text-primary/45">
                      Name
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-normal text-primary/45">
                      Email
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-normal text-primary/45">
                      Date
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-normal text-primary/45">
                      Start time
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-normal text-primary/45">
                      End time
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-normal text-primary/45">
                      Status
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-normal text-primary/45">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {filteredBookings.map((booking) => {
                    const isCheckedIn = checkedInClientIds.has(
                      booking.clientId,
                    );
                    const isCancelled =
                      booking.status === "CANCELLED" ||
                      booking.status === "LATE_CANCEL";
                    const isNoShow = booking.status === "NO_SHOW";
                    const canSelect = !isCheckedIn && !isCancelled && !isNoShow;

                    return (
                      <tr
                        key={booking.id}
                        className="group hover:bg-primary/[0.02] transition-colors"
                      >
                        <td className="px-5 py-3">
                          <Checkbox
                            checked={selectedBookingIds.includes(booking.id)}
                            disabled={!canSelect}
                            onCheckedChange={(checked) =>
                              toggleBookingSelection(
                                booking.id,
                                checked === true,
                              )
                            }
                            aria-label={`Select ${booking.client.name}`}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`size-7 rounded-md flex items-center justify-center text-[10px] font-semibold shrink-0 ${
                                isCheckedIn
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : isCancelled
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    : isNoShow
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                      : "bg-primary/5 text-primary/60"
                              }`}
                            >
                              {booking.client.name?.[0]?.toUpperCase() ?? "?"}
                            </div>
                            <p className="text-xs font-medium text-primary/75 truncate">
                              {booking.client.name}
                            </p>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-xs text-primary/75 truncate">
                            {booking.client.email}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs text-primary/75 whitespace-nowrap">
                            {format(
                              new Date(studioClass.startTime),
                              "MMM d, yyyy",
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-[11px] text-primary/75 whitespace-nowrap">
                            {format(new Date(studioClass.startTime), "h:mm a")}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-[11px] text-primary/75 whitespace-nowrap">
                            {format(new Date(studioClass.endTime), "h:mm a")}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {isCheckedIn ? (
                            <Badge
                              variant="outline"
                              className="text-[11px] w-fit capitalize text-emerald-600 ring-emerald-300 bg-emerald-100 dark:border-emerald-800"
                            >
                              Checked in
                            </Badge>
                          ) : isCancelled ? (
                            <Badge
                              variant="outline"
                              className="text-[11px] w-fit capitalize text-gray-600 ring-gray-300 bg-gray-100 dark:border-gray-700"
                            >
                              {booking.status === "LATE_CANCEL"
                                ? "Late cancel"
                                : "Cancelled"}
                            </Badge>
                          ) : isNoShow ? (
                            <Badge
                              variant="outline"
                              className="text-[11px] w-fit capitalize text-rose-600 ring-rose-300 bg-rose-100 dark:border-rose-800"
                            >
                              No-show
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[11px] w-fit capitalize text-sky-600 ring-sky-300 bg-sky-100 dark:border-sky-800"
                            >
                              Booked
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {!isCheckedIn && !isCancelled && !isNoShow && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 w-max text-xs"
                                onClick={() =>
                                  bulkStatusMutation.mutate({
                                    bookingIds: [booking.id],
                                    status: "NO_SHOW",
                                  })
                                }
                                disabled={bulkStatusMutation.isPending}
                              >
                                No show
                              </Button>
                              <Button
                                size="sm"
                                variant="success"
                                className="h-7 w-max text-xs"
                                onClick={() =>
                                  checkInMutation.mutate({
                                    classId,
                                    clientId: booking.clientId,
                                    method: "MANUAL",
                                  })
                                }
                                disabled={checkInMutation.isPending}
                              >
                                Check in
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="size-8 text-primary/15 mb-3" />
                <p className="text-sm font-medium text-primary">
                  {bookingSearch
                    ? "No members match your search"
                    : "No bookings yet"}
                </p>
                <p className="text-xs text-primary/50 mt-1">
                  {bookingSearch
                    ? "Try a different name or email"
                    : "Bookings will appear here once made"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
