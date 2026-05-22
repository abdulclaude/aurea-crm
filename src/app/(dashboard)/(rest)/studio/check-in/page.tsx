"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  SearchIcon,
  QrCode,
  Flame,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

function CompletionRing({ pct, size = 28 }: { pct: number; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  const center = size / 2;
  const color = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#14b8a6";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.5s ease" }}
      />
    </svg>
  );
}

const TH =
  "text-xs font-normal text-primary/80 dark:text-white/40 border-b border-black/5 whitespace-nowrap p-6";
const TD = "p-6 py-6";
const ROW =
  "h-14 text-xs hover:bg-primary-foreground/50 hover:text-black border-y border-black/5";

export default function CheckInPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const { data: todayClasses, isLoading: classesLoading } = useQuery(
    trpc.studioClassesEnhanced.list.queryOptions({
      startDate: today.toISOString(),
      endDate: tomorrow.toISOString(),
      pageSize: 50,
    }),
  );

  const { data: roster, isLoading: rosterLoading } = useQuery({
    ...trpc.checkin.getClassRoster.queryOptions({ classId: selectedClassId }),
    enabled: !!selectedClassId,
  });

  const checkInMutation = useMutation(
    trpc.checkin.manualCheckIn.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.checkin.getClassRoster.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.checkin.todayStats.queryKey(),
        });
        toast.success("Checked in successfully");
      },
      onError: (err: { message: string }) => toast.error(err.message),
    }),
  );

  const noShowMutation = useMutation(
    trpc.checkin.markNoShow.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.checkin.getClassRoster.queryKey(),
        });
        toast.success("Marked as no-show");
      },
      onError: (err: { message: string }) => toast.error(err.message),
    }),
  );

  const filteredRoster = roster?.roster.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.client.name?.toLowerCase().includes(q) ||
      r.client.email?.toLowerCase().includes(q)
    );
  });

  const totalBooked = roster?.totalBooked ?? 0;
  const selectedClassEnded = roster?.class.endTime
    ? new Date(roster.class.endTime) <= new Date()
    : false;
  const capacityPct = roster?.maxCapacity
    ? Math.round((totalBooked / roster.maxCapacity) * 100)
    : null;

  return (
    <div className="space-y-0">
      <div className="flex flex-wrap items-end justify-between gap-3 p-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Check-in</h1>
          <p className="text-xs text-primary/75">
            Check in members to today&apos;s classes
          </p>
        </div>
        {capacityPct !== null && (
          <div className="flex items-center gap-2 text-xs text-primary/60">
            <CompletionRing pct={capacityPct} />
            <span className="font-medium">{capacityPct}% full</span>
          </div>
        )}
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      {/* Toolbar — matches StudioTableToolbar layout */}
      <div className="flex items-center px-6 py-4 gap-2">
        {classesLoading ? (
          <div className="h-8.5 w-72 animate-pulse rounded-lg bg-primary/5" />
        ) : todayClasses?.classes && todayClasses.classes.length > 0 ? (
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="h-8.5 w-72 rounded-lg">
              <SelectValue placeholder="Select a class..." />
            </SelectTrigger>
            <SelectContent>
              {todayClasses.classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-medium">{cls.name}</span>
                    <span className="text-xs text-primary/50">
                      {format(new Date(cls.startTime), "h:mm a")}
                    </span>
                    <span className="text-[11px] text-primary/40">
                      ({cls._count.studioBooking} / {cls.maxCapacity ?? "∞"})
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-xs text-primary/50">
            No classes scheduled for today.
          </p>
        )}

        {selectedClassId && roster && (
          <div className="relative flex h-8.5 w-64 items-center rounded-lg bg-background transition duration-250 hover:bg-primary-foreground/50">
            <SearchIcon className="absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-primary/50" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members..."
              className="w-full border-none bg-transparent! pl-8 text-xs hover:bg-transparent"
            />
          </div>
        )}
      </div>

      {/* Table / Empty states */}
      {selectedClassId ? (
        rosterLoading ? (
          <div className="border-y border-black/5 dark:border-white/5">
            <div className="flex items-center justify-center py-16">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary/60" />
            </div>
          </div>
        ) : filteredRoster && filteredRoster.length > 0 ? (
          <div className="overflow-x-auto border-y border-black/5 dark:border-white/5">
            <Table className="w-max min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className={TH} style={{ minWidth: 220 }}>
                    Member
                  </TableHead>
                  <TableHead className={TH} style={{ minWidth: 100 }}>
                    Streak
                  </TableHead>
                  <TableHead className={TH} style={{ minWidth: 100 }}>
                    Visits
                  </TableHead>
                  <TableHead className={TH} style={{ minWidth: 150 }}>
                    Booked
                  </TableHead>
                  <TableHead className={TH} style={{ minWidth: 130 }}>
                    Status
                  </TableHead>
                  {!selectedClassEnded && (
                    <TableHead
                      className={TH}
                      style={{ minWidth: 160 }}
                    >
                      Action
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoster.map((entry) => (
                  <TableRow key={entry.bookingId} className={ROW}>
                    <TableCell className={TD}>
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                            entry.isCheckedIn
                              ? "bg-emerald-50 text-emerald-600"
                              : entry.status === "NO_SHOW"
                                ? "bg-amber-50 text-amber-600"
                                : "bg-primary/5 text-primary/50",
                          )}
                        >
                          {entry.client.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-primary">
                            {entry.client.name}
                          </p>
                          <p className="truncate text-[11px] text-primary/40">
                            {entry.client.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={TD}>
                      <div className="flex items-center gap-1.5 text-xs text-primary/50">
                        <Flame className="size-3 text-orange-400" />
                        <span>{entry.client.currentStreak}</span>
                      </div>
                    </TableCell>
                    <TableCell className={TD}>
                      <span className="text-xs text-primary/50">
                        {entry.client.attendanceCount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className={TD}>
                      <span className="text-[11px] text-primary/40">
                        {entry.bookedAt
                          ? format(new Date(entry.bookedAt), "MMM d, h:mm a")
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell className={TD}>
                      <div className="flex items-center gap-1.5">
                        {entry.isCheckedIn ? (
                          <Badge
                            variant="outline"
                            className="text-[11px] w-fit capitalize text-emerald-600 ring-emerald-300 bg-emerald-100 dark:border-emerald-800"
                          >
                            Checked in
                          </Badge>
                        ) : entry.status === "NO_SHOW" ? (
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
                        {entry.isCheckedIn && entry.checkIn?.isLateArrival && (
                          <Badge
                            variant="outline"
                            className="text-[11px] w-fit capitalize text-amber-600 ring-amber-300 bg-amber-100 dark:border-amber-800"
                          >
                            Late
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {!selectedClassEnded && (
                      <TableCell className={TD}>
                        {!entry.isCheckedIn && entry.status !== "NO_SHOW" && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 w-max text-xs"
                              onClick={() =>
                                noShowMutation.mutate({
                                  bookingId: entry.bookingId,
                                })
                              }
                              disabled={noShowMutation.isPending}
                            >
                              No show
                            </Button>
                            <Button
                              size="sm"
                              variant="success"
                              className="h-7 w-max text-xs"
                              onClick={() =>
                                checkInMutation.mutate({
                                  classId: selectedClassId,
                                  clientId: entry.client.id,
                                  method: "MANUAL",
                                })
                              }
                              disabled={checkInMutation.isPending}
                            >
                              Check in
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : roster && roster.roster.length === 0 ? (
          <EmptyPanel
            icon={<QrCode className="size-8 text-primary/20" />}
            title="No bookings for this class"
            subtitle="Clients will appear here once they book."
          />
        ) : searchQuery ? (
          <EmptyPanel
            icon={<Search className="size-8 text-primary/20" />}
            title="No members match your search"
          />
        ) : null
      ) : todayClasses?.classes && todayClasses.classes.length > 0 ? (
        <EmptyPanel
          icon={<QrCode className="size-8 text-primary/20" />}
          title="Select a class to view its roster"
          subtitle="Choose a class above to check in members."
        />
      ) : !classesLoading ? (
        <EmptyPanel
          icon={<Clock className="size-8 text-primary/20" />}
          title="No classes today"
          subtitle="There are no classes scheduled for today."
        />
      ) : null}
    </div>
  );
}

function EmptyPanel({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="border-y border-black/5 dark:border-white/5">
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        {icon}
        <p className="text-sm text-primary/50">{title}</p>
        {subtitle && <p className="text-xs text-primary/30">{subtitle}</p>}
      </div>
    </div>
  );
}
