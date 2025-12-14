"use client";

import { use, useState } from "react";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, endOfWeek, differenceInDays } from "date-fns";
import {
  Clock,
  Check,
  X,
  Calendar,
  ArrowLeftRight,
  Plus,
  Umbrella,
} from "lucide-react";
import { toast } from "sonner";
import type { ShiftSwapStatus, ApprovalStatus, TimeOffType } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const SHIFT_SWAP_STATUS_CONFIG: Record<
  ShiftSwapStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    variant: "default" | "destructive" | "outline" | "secondary";
    className?: string;
  }
> = {
  PENDING: {
    label: "Pending Review",
    icon: Clock,
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    variant: "secondary",
  },
  WORKER_ACCEPTED: {
    label: "Accepted (Awaiting Admin)",
    icon: Check,
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    variant: "default",
  },
  ADMIN_APPROVED: {
    label: "Approved",
    icon: Check,
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    variant: "outline",
    className: "bg-emerald-500 text-white border-emerald-500",
  },
  ADMIN_REJECTED: {
    label: "Rejected",
    icon: X,
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    variant: "destructive",
  },
  WORKER_REJECTED: {
    label: "Rejected",
    icon: X,
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    variant: "destructive",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: X,
    color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    variant: "outline",
  },
  EXPIRED: {
    label: "Expired",
    icon: Clock,
    color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    variant: "outline",
  },
};

const TIME_OFF_STATUS_CONFIG: Record<
  ApprovalStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    variant: "default" | "destructive" | "outline" | "secondary";
    className?: string;
  }
> = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    variant: "secondary",
  },
  APPROVED: {
    label: "Approved",
    icon: Check,
    variant: "outline",
    className: "bg-emerald-500 text-white border-emerald-500",
  },
  REJECTED: {
    label: "Rejected",
    icon: X,
    variant: "destructive",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: X,
    variant: "outline",
  },
};

const TIME_OFF_TYPE_LABELS: Record<TimeOffType, string> = {
  VACATION: "Vacation",
  SICK: "Sick Leave",
  PERSONAL: "Personal Day",
  BEREAVEMENT: "Bereavement",
  PARENTAL: "Parental Leave",
  UNPAID: "Unpaid Leave",
  COMPENSATORY: "Compensatory Time",
  PUBLIC_HOLIDAY: "Public Holiday",
  OTHER: "Other",
};

type RequestType = "shift_swap" | "time_off";

export default function WorkerRequestsPage({
  params,
}: {
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = use(params);
  const trpc = useTRPC();
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>("shift_swap");

  // Shift swap state
  const [selectedShiftId, setSelectedShiftId] = useState<string>("");
  const [swapReason, setSwapReason] = useState("");

  // Time off state
  const [timeOffType, setTimeOffType] = useState<TimeOffType>("VACATION");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startHalfDay, setStartHalfDay] = useState(false);
  const [endHalfDay, setEndHalfDay] = useState(false);
  const [timeOffReason, setTimeOffReason] = useState("");

  // Fetch swap requests
  const { data: swapRequests, refetch: refetchSwaps } = useSuspenseQuery(
    trpc.shiftSwaps.list.queryOptions({
      workerId,
    })
  );

  // Fetch time off requests
  const { data: timeOffRequests, refetch: refetchTimeOff } = useSuspenseQuery(
    trpc.availability.listTimeOff.queryOptions({
      workerId,
    })
  );

  // Fetch upcoming shifts for swap requests
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const { data: scheduleData } = useSuspenseQuery(
    trpc.workers.getSchedule.queryOptions({
      workerId,
      startDate: weekStart,
      endDate: weekEnd,
    })
  );

  const upcomingShifts = (scheduleData?.shifts || [])
    .filter((shift: any) => {
      const shiftStart = new Date(shift.startTime);
      const now = new Date();
      return (
        shiftStart > now &&
        (shift.status === "SCHEDULED" || shift.status === "CONFIRMED")
      );
    })
    .sort(
      (a: any, b: any) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

  // Mutations
  const cancelSwapMutation = useMutation(
    trpc.shiftSwaps.cancel.mutationOptions({
      onSuccess: () => {
        toast.success("Swap request cancelled");
        refetchSwaps();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to cancel swap request");
      },
    })
  );

  const createSwapMutation = useMutation(
    trpc.shiftSwaps.create.mutationOptions({
      onSuccess: () => {
        toast.success("Swap request submitted successfully");
        resetDialog();
        refetchSwaps();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create swap request");
      },
    })
  );

  const createTimeOffMutation = useMutation(
    trpc.availability.createTimeOff.mutationOptions({
      onSuccess: () => {
        toast.success("Time off request submitted successfully");
        resetDialog();
        refetchTimeOff();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create time off request");
      },
    })
  );

  const cancelTimeOffMutation = useMutation(
    trpc.availability.cancelTimeOff.mutationOptions({
      onSuccess: () => {
        toast.success("Time off request cancelled");
        refetchTimeOff();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to cancel time off request");
      },
    })
  );

  const resetDialog = () => {
    setNewRequestOpen(false);
    setRequestType("shift_swap");
    setSelectedShiftId("");
    setSwapReason("");
    setTimeOffType("VACATION");
    setStartDate("");
    setEndDate("");
    setStartHalfDay(false);
    setEndHalfDay(false);
    setTimeOffReason("");
  };

  const handleCancelSwap = (swapRequestId: string) => {
    if (confirm("Are you sure you want to cancel this swap request?")) {
      cancelSwapMutation.mutate({ swapRequestId });
    }
  };

  const handleCancelTimeOff = (requestId: string) => {
    if (confirm("Are you sure you want to cancel this time off request?")) {
      cancelTimeOffMutation.mutate({ requestId });
    }
  };

  const handleSubmitRequest = () => {
    if (requestType === "shift_swap") {
      if (!selectedShiftId) {
        toast.error("Please select a shift");
        return;
      }
      createSwapMutation.mutate({
        rotaId: selectedShiftId,
        reason: swapReason || undefined,
        expiresInDays: 7,
      });
    } else {
      if (!startDate || !endDate) {
        toast.error("Please select start and end dates");
        return;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        toast.error("End date must be after start date");
        return;
      }

      createTimeOffMutation.mutate({
        workerId,
        type: timeOffType,
        startDate: start,
        endDate: end,
        startHalfDay,
        endHalfDay,
        reason: timeOffReason || undefined,
      });
    }
  };

  // Combine and filter all requests
  const allRequests = [
    ...swapRequests.items.map((r) => ({ ...r, requestType: "shift_swap" as const })),
    ...timeOffRequests.items.map((r) => ({ ...r, requestType: "time_off" as const })),
  ].sort((a, b) => {
    const aDate =
      a.requestType === "shift_swap" ? a.requestedAt : a.requestedAt;
    const bDate =
      b.requestType === "shift_swap" ? b.requestedAt : b.requestedAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  const filteredRequests = allRequests.filter((request) => {
    if (filter === "pending") {
      if (request.requestType === "shift_swap") {
        return (
          request.status === "PENDING" || request.status === "WORKER_ACCEPTED"
        );
      } else {
        return request.status === "PENDING";
      }
    }
    if (filter === "completed") {
      if (request.requestType === "shift_swap") {
        return [
          "ADMIN_APPROVED",
          "ADMIN_REJECTED",
          "WORKER_REJECTED",
          "CANCELLED",
          "EXPIRED",
        ].includes(request.status);
      } else {
        return ["APPROVED", "REJECTED", "CANCELLED"].includes(request.status);
      }
    }
    return true;
  });

  const pendingCount = allRequests.filter((r) => {
    if (r.requestType === "shift_swap") {
      return r.status === "PENDING" || r.status === "WORKER_ACCEPTED";
    }
    return r.status === "PENDING";
  }).length;

  const selectedShift = upcomingShifts.find((s: any) => s.id === selectedShiftId);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">My Requests</h1>
          <p className="text-sm text-primary/60 mt-1">
            View and manage your shift swaps, time off, and other requests
          </p>
        </div>
        <Button onClick={() => setNewRequestOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All Requests
        </Button>
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("pending")}
        >
          Pending
          {pendingCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
              {pendingCount}
            </Badge>
          )}
        </Button>
        <Button
          variant={filter === "completed" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("completed")}
        >
          Completed
        </Button>
      </div>

      {/* Requests List */}
      {filteredRequests?.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-primary/20 mb-4" />
            <h3 className="text-lg font-medium text-primary mb-2">
              No requests
            </h3>
            <p className="text-sm text-primary/60">
              {filter === "pending"
                ? "You don't have any pending requests"
                : filter === "completed"
                  ? "You don't have any completed requests"
                  : "You haven't made any requests yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests?.map((request) => {
            if (request.requestType === "shift_swap") {
              const statusConfig =
                SHIFT_SWAP_STATUS_CONFIG[request.status as ShiftSwapStatus];
              const StatusIcon = statusConfig.icon;
              const canCancel =
                request.status === "PENDING" ||
                request.status === "WORKER_ACCEPTED";

              return (
                <Card key={`swap-${request.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <ArrowLeftRight className="h-4 w-4 text-primary/60" />
                          <CardTitle className="text-base">
                            Shift Swap Request
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-primary/60">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(request.rota.startTime, "EEEE, d MMMM yyyy")}
                          </span>
                          <span>•</span>
                          <span>
                            {format(request.rota.startTime, "h:mm a")} -{" "}
                            {format(request.rota.endTime, "h:mm a")}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={statusConfig.variant}
                        className={statusConfig.className || statusConfig.color}
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2 text-sm">
                      {request.rota.contact && (
                        <div className="flex justify-between">
                          <span className="text-primary/60">Client:</span>
                          <span className="font-medium">
                            {request.rota.contact.name}
                          </span>
                        </div>
                      )}
                      {request.rota.location && (
                        <div className="flex justify-between">
                          <span className="text-primary/60">Location:</span>
                          <span className="font-medium">
                            {request.rota.location}
                          </span>
                        </div>
                      )}
                      {request.targetWorker && (
                        <div className="flex justify-between">
                          <span className="text-primary/60">
                            Requested worker:
                          </span>
                          <span className="font-medium">
                            {request.targetWorker.name}
                          </span>
                        </div>
                      )}
                      {!request.targetWorker && (
                        <div className="flex justify-between">
                          <span className="text-primary/60">
                            Requested worker:
                          </span>
                          <span className="italic text-primary/60">
                            Open to all
                          </span>
                        </div>
                      )}
                      {request.reason && (
                        <div className="pt-2 border-t">
                          <div className="text-primary/60 mb-1">Reason:</div>
                          <p className="text-sm">{request.reason}</p>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-primary/60">Requested:</span>
                        <span>{format(request.requestedAt, "PPp")}</span>
                      </div>
                      {request.status === "ADMIN_APPROVED" &&
                        request.adminApprovedAt && (
                          <div className="flex justify-between">
                            <span className="text-primary/60">Approved:</span>
                            <span>
                              {format(request.adminApprovedAt, "PPp")}
                            </span>
                          </div>
                        )}
                      {(request.status === "ADMIN_REJECTED" ||
                        request.status === "WORKER_REJECTED") &&
                        request.rejectionReason && (
                          <div className="pt-2 border-t">
                            <div className="text-red-600 mb-1">
                              Rejection reason:
                            </div>
                            <p className="text-sm text-red-600/80">
                              {request.rejectionReason}
                            </p>
                          </div>
                        )}
                      {request.expiresAt && request.status === "PENDING" && (
                        <div className="flex justify-between text-amber-600">
                          <span>Expires:</span>
                          <span>{format(request.expiresAt, "PPp")}</span>
                        </div>
                      )}
                    </div>

                    {canCancel && (
                      <div className="pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelSwap(request.id)}
                          disabled={cancelSwapMutation.isPending}
                          className="w-full"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel Request
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            } else {
              // Time off request
              const statusConfig =
                TIME_OFF_STATUS_CONFIG[request.status as ApprovalStatus];
              const StatusIcon = statusConfig.icon;
              const canCancel = request.status === "PENDING";
              const dayCount =
                differenceInDays(
                  new Date(request.endDate),
                  new Date(request.startDate)
                ) + 1;

              return (
                <Card key={`timeoff-${request.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Umbrella className="h-4 w-4 text-primary/60" />
                          <CardTitle className="text-base">
                            {TIME_OFF_TYPE_LABELS[request.type as TimeOffType]}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-primary/60">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(request.startDate, "d MMM yyyy")}
                            {request.startHalfDay && " (Half day)"}
                          </span>
                          <span>→</span>
                          <span>
                            {format(request.endDate, "d MMM yyyy")}
                            {request.endHalfDay && " (Half day)"}
                          </span>
                          <span>•</span>
                          <span>{dayCount} day{dayCount !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                      <Badge
                        variant={statusConfig.variant}
                        className={statusConfig.className}
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2 text-sm">
                      {request.reason && (
                        <div className="pt-2 border-t">
                          <div className="text-primary/60 mb-1">Reason:</div>
                          <p className="text-sm">{request.reason}</p>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-primary/60">Requested:</span>
                        <span>{format(request.requestedAt, "PPp")}</span>
                      </div>
                      {request.status === "APPROVED" &&
                        request.approvedAt && (
                          <div className="flex justify-between">
                            <span className="text-primary/60">Approved:</span>
                            <span>{format(request.approvedAt, "PPp")}</span>
                          </div>
                        )}
                      {request.status === "REJECTED" &&
                        request.rejectionReason && (
                          <div className="pt-2 border-t">
                            <div className="text-red-600 mb-1">
                              Rejection reason:
                            </div>
                            <p className="text-sm text-red-600/80">
                              {request.rejectionReason}
                            </p>
                          </div>
                        )}
                    </div>

                    {canCancel && (
                      <div className="pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelTimeOff(request.id)}
                          disabled={cancelTimeOffMutation.isPending}
                          className="w-full"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel Request
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            }
          })}
        </div>
      )}

      {/* New Request Dialog */}
      <Dialog open={newRequestOpen} onOpenChange={setNewRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Request</DialogTitle>
            <DialogDescription>
              Submit a new shift swap or time off request
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Request Type Selector */}
            <div className="space-y-2">
              <Label>Request Type</Label>
              <Select
                value={requestType}
                onValueChange={(value) => setRequestType(value as RequestType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shift_swap">Shift Swap</SelectItem>
                  <SelectItem value="time_off">Time Off</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Shift Swap Form */}
            {requestType === "shift_swap" && (
              <>
                <div className="space-y-2">
                  <Label>Select Shift to Swap</Label>
                  <Select
                    value={selectedShiftId}
                    onValueChange={setSelectedShiftId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a shift..." />
                    </SelectTrigger>
                    <SelectContent>
                      {upcomingShifts.length === 0 ? (
                        <div className="p-2 text-sm text-primary/60">
                          No upcoming shifts available
                        </div>
                      ) : (
                        upcomingShifts.map((shift: any) => (
                          <SelectItem key={shift.id} value={shift.id}>
                            {format(shift.startTime, "EEE, MMM d")} •{" "}
                            {format(shift.startTime, "h:mm a")} -{" "}
                            {format(shift.endTime, "h:mm a")}
                            {shift.contact && ` - ${shift.contact.name}`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedShift && (
                  <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                    <div className="font-medium">
                      {format(selectedShift.startTime, "EEEE, MMMM d, yyyy")}
                    </div>
                    <div className="text-primary/60">
                      {format(selectedShift.startTime, "h:mm a")} -{" "}
                      {format(selectedShift.endTime, "h:mm a")}
                    </div>
                    {selectedShift.contact && (
                      <div className="text-primary/60">
                        Client: {selectedShift.contact.name}
                      </div>
                    )}
                  </div>
                )}

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
              </>
            )}

            {/* Time Off Form */}
            {requestType === "time_off" && (
              <>
                <div className="space-y-2">
                  <Label>Type of Time Off</Label>
                  <Select
                    value={timeOffType}
                    onValueChange={(value) =>
                      setTimeOffType(value as TimeOffType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIME_OFF_TYPE_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={format(new Date(), "yyyy-MM-dd")}
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="checkbox"
                        id="start-half-day"
                        checked={startHalfDay}
                        onChange={(e) => setStartHalfDay(e.target.checked)}
                        className="rounded"
                      />
                      <Label
                        htmlFor="start-half-day"
                        className="text-xs cursor-pointer"
                      >
                        Half day
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || format(new Date(), "yyyy-MM-dd")}
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="checkbox"
                        id="end-half-day"
                        checked={endHalfDay}
                        onChange={(e) => setEndHalfDay(e.target.checked)}
                        className="rounded"
                      />
                      <Label
                        htmlFor="end-half-day"
                        className="text-xs cursor-pointer"
                      >
                        Half day
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeoff-reason">Reason (Optional)</Label>
                  <Textarea
                    id="timeoff-reason"
                    placeholder="Additional details about your request..."
                    value={timeOffReason}
                    onChange={(e) => setTimeOffReason(e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitRequest}
              disabled={
                createSwapMutation.isPending || createTimeOffMutation.isPending
              }
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
