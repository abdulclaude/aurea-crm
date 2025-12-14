"use client";

import { use, useState } from "react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isToday, isSameDay, parseISO } from "date-fns";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Building2,
  User,
  CalendarDays,
  ArrowLeftRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_COLORS = {
  SCHEDULED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  CONFIRMED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
  COMPLETED: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  NO_SHOW: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

function formatDuration(startTime: Date, endTime: Date): string {
  const diff = new Date(endTime).getTime() - new Date(startTime).getTime();
  const hours = Math.floor(diff / 1000 / 60 / 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

interface Shift {
  id: string;
  title: string | null;
  description: string | null;
  location: string | null;
  companyName: string | null;
  startTime: Date;
  endTime: Date;
  status: keyof typeof STATUS_COLORS;
  contact: {
    id: string;
    name: string;
    companyName: string | null;
  } | null;
}

function ShiftCard({
  shift,
  onRequestSwap
}: {
  shift: Shift;
  onRequestSwap?: (shiftId: string) => void;
}) {
  const isUpcoming = new Date(shift.startTime) > new Date();
  const isActive =
    new Date(shift.startTime) <= new Date() &&
    new Date(shift.endTime) >= new Date();

  const canRequestSwap = isUpcoming && (shift.status === "SCHEDULED" || shift.status === "CONFIRMED");

  return (
    <Card
      className={cn(
        "transition-all",
        isActive && "ring-2 ring-emerald-500 ring-offset-2 ring-offset-background"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">
                {shift.title || shift.companyName || "Shift"}
              </h3>
              {isActive && (
                <Badge className="bg-emerald-500 text-white">In Progress</Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-primary/60">
              <div className="flex items-center gap-1">
                <Clock className="size-4" />
                {format(new Date(shift.startTime), "h:mm a")} -{" "}
                {format(new Date(shift.endTime), "h:mm a")}
              </div>
              <span className="text-primary/40">
                ({formatDuration(shift.startTime, shift.endTime)})
              </span>
            </div>

            {(shift.location || shift.contact?.companyName || shift.companyName) && (
              <div className="flex items-center gap-4 text-sm text-primary/60">
                {shift.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="size-4" />
                    {shift.location}
                  </div>
                )}
                {(shift.contact?.companyName || shift.companyName) && (
                  <div className="flex items-center gap-1">
                    <Building2 className="size-4" />
                    {shift.contact?.companyName || shift.companyName}
                  </div>
                )}
              </div>
            )}

            {shift.description && (
              <p className="text-sm text-primary/60 mt-2">{shift.description}</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <Badge
              variant="outline"
              className={cn(STATUS_COLORS[shift.status], "capitalize")}
            >
              {shift.status.toLowerCase().replace("_", " ")}
            </Badge>

            {canRequestSwap && onRequestSwap && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRequestSwap(shift.id)}
                className="text-xs"
              >
                <ArrowLeftRight className="size-3 mr-1" />
                Request Swap
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DayColumn({
  date,
  shifts,
}: {
  date: Date;
  shifts: Shift[];
}) {
  const dayShifts = shifts.filter((s) =>
    isSameDay(new Date(s.startTime), date)
  );
  const isCurrentDay = isToday(date);

  return (
    <div
      className={cn(
        "min-h-[200px] p-3 rounded-lg border",
        isCurrentDay
          ? "border-blue-500/30 bg-blue-500/5"
          : "border-primary/10 bg-primary/5"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div
            className={cn(
              "text-sm font-medium",
              isCurrentDay && "text-blue-500"
            )}
          >
            {format(date, "EEEE")}
          </div>
          <div
            className={cn(
              "text-xs",
              isCurrentDay ? "text-blue-500/70" : "text-primary/60"
            )}
          >
            {format(date, "d MMM")}
          </div>
        </div>
        {isCurrentDay && (
          <Badge className="bg-blue-500 text-white text-xs">Today</Badge>
        )}
      </div>

      {dayShifts.length === 0 ? (
        <div className="text-center py-8 text-primary/40 text-sm">No shifts</div>
      ) : (
        <div className="space-y-2">
          {dayShifts.map((shift) => (
            <div
              key={shift.id}
              className={cn(
                "p-2 rounded border text-sm",
                STATUS_COLORS[shift.status]
              )}
            >
              <div className="font-medium truncate">
                {shift.title || shift.companyName || "Shift"}
              </div>
              <div className="text-xs opacity-70">
                {format(new Date(shift.startTime), "h:mm a")} -{" "}
                {format(new Date(shift.endTime), "h:mm a")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorkerSchedulePage({
  params,
}: {
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = use(params);
  const trpc = useTRPC();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [view, setView] = useState<"week" | "list">("week");
  const [swapRequestOpen, setSwapRequestOpen] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [swapReason, setSwapReason] = useState("");

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  const { data: scheduleData, refetch } = useSuspenseQuery(
    trpc.workers.getSchedule.queryOptions({
      workerId,
      startDate: weekStart,
      endDate: weekEnd,
    })
  );

  const createSwapMutation = useMutation(
    trpc.shiftSwaps.create.mutationOptions({
      onSuccess: () => {
        toast.success("Swap request submitted successfully");
        setSwapRequestOpen(false);
        setSelectedShiftId(null);
        setSwapReason("");
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create swap request");
      },
    })
  );

  const handleRequestSwap = (shiftId: string) => {
    setSelectedShiftId(shiftId);
    setSwapRequestOpen(true);
  };

  const handleSubmitSwap = () => {
    if (!selectedShiftId) return;

    createSwapMutation.mutate({
      rotaId: selectedShiftId,
      reason: swapReason || undefined,
      expiresInDays: 7,
    });
  };

  const shifts = (scheduleData?.shifts || []) as Shift[];
  const selectedShift = selectedShiftId
    ? shifts.find((s) => s.id === selectedShiftId)
    : null;

  // Get today's shifts
  const todayShifts = shifts.filter((s) => isToday(new Date(s.startTime)));

  // Get upcoming shifts (future)
  const upcomingShifts = shifts
    .filter((s) => new Date(s.startTime) > new Date())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  // Stats
  const stats = {
    totalShifts: shifts.length,
    totalHours: shifts.reduce((acc, shift) => {
      const diff = new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime();
      return acc + diff / 1000 / 60 / 60;
    }, 0),
    scheduledCount: shifts.filter((s) => s.status === "SCHEDULED").length,
    confirmedCount: shifts.filter((s) => s.status === "CONFIRMED").length,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">My Schedule</h1>
          <p className="text-sm text-primary/60">
            View your upcoming shifts and work schedule
          </p>
        </div>
      </div>

      {/* Today's Shifts */}
      {todayShifts.length > 0 && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="size-5 text-emerald-500" />
              Today&apos;s Shifts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayShifts.map((shift) => (
              <ShiftCard key={shift.id} shift={shift} onRequestSwap={handleRequestSwap} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Week Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalShifts}</div>
            <p className="text-sm text-primary/60">Shifts This Week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalHours.toFixed(1)}h</div>
            <p className="text-sm text-primary/60">Total Hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-500">{stats.scheduledCount}</div>
            <p className="text-sm text-primary/60">Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-500">{stats.confirmedCount}</div>
            <p className="text-sm text-primary/60">Confirmed</p>
          </CardContent>
        </Card>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentWeek((w) => subWeeks(w, 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>

              <div className="text-center">
                <div className="font-semibold">
                  {format(weekStart, "d MMM")} - {format(weekEnd, "d MMM yyyy")}
                </div>
                <div className="text-xs text-primary/60">
                  Week {format(weekStart, "w")}
                </div>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentWeek((w) => addWeeks(w, 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(new Date())}
              >
                Today
              </Button>
              <Tabs value={view} onValueChange={(v) => setView(v as "week" | "list")}>
                <TabsList>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="list">List</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {view === "week" ? (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((date) => (
                <DayColumn key={date.toISOString()} date={date} shifts={shifts} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {shifts.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="size-12 mx-auto text-primary/20 mb-4" />
                  <h3 className="text-lg font-medium text-primary">No shifts this week</h3>
                  <p className="text-sm text-primary/60 mt-1">
                    You don&apos;t have any scheduled shifts for this week
                  </p>
                </div>
              ) : (
                shifts
                  .sort(
                    (a, b) =>
                      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                  )
                  .map((shift) => (
                    <div key={shift.id}>
                      <div className="text-xs font-medium text-primary/60 mb-2">
                        {format(new Date(shift.startTime), "EEEE, d MMMM")}
                      </div>
                      <ShiftCard shift={shift} onRequestSwap={handleRequestSwap} />
                    </div>
                  ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Shifts */}
      {upcomingShifts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Shifts</CardTitle>
            <CardDescription>Your next scheduled shifts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingShifts.slice(0, 5).map((shift) => (
              <div
                key={shift.id}
                className="flex items-center justify-between p-3 rounded-lg border border-primary/10"
              >
                <div>
                  <div className="font-medium">
                    {shift.title || shift.companyName || "Shift"}
                  </div>
                  <div className="text-sm text-primary/60">
                    {format(new Date(shift.startTime), "EEEE, d MMM")} at{" "}
                    {format(new Date(shift.startTime), "h:mm a")}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(STATUS_COLORS[shift.status], "capitalize")}
                >
                  {shift.status.toLowerCase().replace("_", " ")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Swap Request Dialog */}
      <Dialog open={swapRequestOpen} onOpenChange={setSwapRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Shift Swap</DialogTitle>
            <DialogDescription>
              Request to swap this shift with another worker. An admin will review your request.
            </DialogDescription>
          </DialogHeader>

          {selectedShift && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 space-y-2 text-sm bg-primary/5">
                <div className="flex justify-between">
                  <span className="text-primary/60">Shift:</span>
                  <span className="font-medium">
                    {selectedShift.title || selectedShift.companyName || "Shift"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary/60">Date:</span>
                  <span className="font-medium">
                    {format(selectedShift.startTime, "EEEE, d MMMM yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary/60">Time:</span>
                  <span className="font-medium">
                    {format(selectedShift.startTime, "h:mm a")} -{" "}
                    {format(selectedShift.endTime, "h:mm a")}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="swap-reason">Reason (Optional)</Label>
                <Textarea
                  id="swap-reason"
                  placeholder="Why do you need to swap this shift?"
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSwapRequestOpen(false);
                setSwapReason("");
              }}
              disabled={createSwapMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitSwap}
              disabled={createSwapMutation.isPending}
            >
              {createSwapMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
