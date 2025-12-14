"use client";

import { useState } from "react";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Check, X, Clock, UserCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { ShiftSwapStatus, ApprovalStatus } from "@prisma/client";

type SwapRequest = any;
type TimeOffRequest = any;

function getSwapStatusBadge(status: ShiftSwapStatus) {
  switch (status) {
    case "PENDING":
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    case "WORKER_ACCEPTED":
      return <Badge variant="default"><UserCheck className="h-3 w-3 mr-1" />Worker Accepted</Badge>;
    case "ADMIN_APPROVED":
      return <Badge className="bg-emerald-500 text-white"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
    case "ADMIN_REJECTED":
    case "WORKER_REJECTED":
      return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
    case "CANCELLED":
      return <Badge variant="outline">Cancelled</Badge>;
    case "EXPIRED":
      return <Badge variant="outline">Expired</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function getTimeOffStatusBadge(status: ApprovalStatus) {
  switch (status) {
    case "PENDING":
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    case "APPROVED":
      return <Badge className="bg-emerald-500 text-white"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
    case "REJECTED":
      return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
    case "CANCELLED":
      return <Badge variant="outline">Cancelled</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export function RequestsView() {
  const trpc = useTRPC();
  const [activeTab, setActiveTab] = useState<"swaps" | "timeoff">("swaps");
  const [reviewingSwap, setReviewingSwap] = useState<SwapRequest | null>(null);
  const [reviewingTimeOff, setReviewingTimeOff] = useState<TimeOffRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");

  // Fetch shift swap requests
  const { data: swapData, refetch: refetchSwaps } = useSuspenseQuery(
    trpc.shiftSwaps.list.queryOptions({
      status: undefined, // Show all
    })
  );

  // Fetch time off requests
  const { data: timeOffData, refetch: refetchTimeOff } = useSuspenseQuery(
    trpc.availability.listTimeOff.queryOptions({
      status: undefined, // Show all
    })
  );

  // Approve/reject swap request
  const approveSwapMutation = useMutation(
    trpc.shiftSwaps.adminApproval.mutationOptions({
      onSuccess: () => {
        toast.success(
          reviewAction === "approve"
            ? "Shift swap approved"
            : "Shift swap rejected"
        );
        refetchSwaps();
        setReviewingSwap(null);
        setRejectionReason("");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to process swap request");
      },
    })
  );

  // Approve/reject time off request
  const approveTimeOffMutation = useMutation(
    trpc.availability.approveTimeOff.mutationOptions({
      onSuccess: () => {
        toast.success(
          reviewAction === "approve"
            ? "Time off approved"
            : "Time off rejected"
        );
        refetchTimeOff();
        setReviewingTimeOff(null);
        setRejectionReason("");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to process time off request");
      },
    })
  );

  const handleSwapReview = (swap: SwapRequest, action: "approve" | "reject") => {
    setReviewingSwap(swap);
    setReviewAction(action);
    setRejectionReason("");
  };

  const handleTimeOffReview = (
    request: TimeOffRequest,
    action: "approve" | "reject"
  ) => {
    setReviewingTimeOff(request);
    setReviewAction(action);
    setRejectionReason("");
  };

  const handleSwapApproval = () => {
    if (!reviewingSwap) return;

    if (reviewAction === "reject" && !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    approveSwapMutation.mutate({
      swapRequestId: reviewingSwap.id,
      approve: reviewAction === "approve",
      rejectionReason: reviewAction === "reject" ? rejectionReason : undefined,
    });
  };

  const handleTimeOffApproval = () => {
    if (!reviewingTimeOff) return;

    if (reviewAction === "reject" && !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    approveTimeOffMutation.mutate({
      requestId: reviewingTimeOff.id,
      approve: reviewAction === "approve",
      rejectionReason: reviewAction === "reject" ? rejectionReason : undefined,
    });
  };

  const pendingSwaps = swapData?.items.filter(
    (s) => s.status === "PENDING" || s.status === "WORKER_ACCEPTED"
  ) || [];
  const pendingTimeOff = timeOffData?.items.filter(
    (t) => t.status === "PENDING"
  ) || [];

  return (
    <>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="swaps">
            Shift Swaps
            {pendingSwaps.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                {pendingSwaps.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="timeoff">
            Time Off
            {pendingTimeOff.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                {pendingTimeOff.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="swaps" className="space-y-4 mt-4">
          {swapData?.items.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-sm text-primary/60">No shift swap requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {swapData?.items.map((swap) => (
                <Card key={swap.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          {swap.rota.title || "Shift Swap Request"}
                        </CardTitle>
                        <p className="text-sm text-primary/60">
                          {format(swap.rota.startTime, "PPP")} •{" "}
                          {format(swap.rota.startTime, "p")} -{" "}
                          {format(swap.rota.endTime, "p")}
                        </p>
                      </div>
                      {getSwapStatusBadge(swap.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-primary/60">From:</span>
                        <span className="font-medium">{swap.requester.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-primary/60">To:</span>
                        <span className="font-medium">
                          {swap.targetWorker?.name || "Open to all"}
                        </span>
                      </div>
                      {swap.rota.contact && (
                        <div className="flex justify-between">
                          <span className="text-primary/60">Client:</span>
                          <span className="font-medium">
                            {swap.rota.contact.name}
                          </span>
                        </div>
                      )}
                      {swap.reason && (
                        <div className="flex flex-col gap-1">
                          <span className="text-primary/60">Reason:</span>
                          <p className="text-sm">{swap.reason}</p>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-primary/60">Requested:</span>
                        <span>{format(swap.requestedAt, "PPp")}</span>
                      </div>
                    </div>

                    {(swap.status === "PENDING" || swap.status === "WORKER_ACCEPTED") && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => handleSwapReview(swap, "approve")}
                          className="flex-1"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleSwapReview(swap, "reject")}
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeoff" className="space-y-4 mt-4">
          {timeOffData?.items.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-sm text-primary/60">No time off requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {timeOffData?.items.map((request) => (
                <Card key={request.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          {request.type.replace("_", " ")}
                        </CardTitle>
                        <p className="text-sm text-primary/60">
                          {request.worker.name}
                        </p>
                      </div>
                      {getTimeOffStatusBadge(request.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-primary/60">Dates:</span>
                        <span className="font-medium">
                          {format(request.startDate, "PP")} -{" "}
                          {format(request.endDate, "PP")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-primary/60">Duration:</span>
                        <span className="font-medium">
                          {Number(request.totalDays)} day
                          {Number(request.totalDays) !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {request.reason && (
                        <div className="flex flex-col gap-1">
                          <span className="text-primary/60">Reason:</span>
                          <p className="text-sm">{request.reason}</p>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-primary/60">Requested:</span>
                        <span>{format(request.requestedAt, "PPp")}</span>
                      </div>
                    </div>

                    {request.status === "PENDING" && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => handleTimeOffReview(request, "approve")}
                          className="flex-1"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleTimeOffReview(request, "reject")}
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Swap Request Review Dialog */}
      {reviewingSwap && (
        <Dialog
          open={!!reviewingSwap}
          onOpenChange={() => {
            setReviewingSwap(null);
            setRejectionReason("");
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {reviewAction === "approve" ? "Approve" : "Reject"} Shift Swap
              </DialogTitle>
              <DialogDescription>
                {reviewAction === "approve"
                  ? `Approve shift swap from ${reviewingSwap.requester.name} to ${reviewingSwap.targetWorker?.name || "open"}`
                  : "Provide a reason for rejecting this swap request"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-primary/60">Shift:</span>
                  <span>{reviewingSwap.rota.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary/60">Date:</span>
                  <span>{format(reviewingSwap.rota.startTime, "PPP")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary/60">Time:</span>
                  <span>
                    {format(reviewingSwap.rota.startTime, "p")} -{" "}
                    {format(reviewingSwap.rota.endTime, "p")}
                  </span>
                </div>
              </div>

              {reviewAction === "reject" && (
                <Textarea
                  placeholder="Reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setReviewingSwap(null);
                  setRejectionReason("");
                }}
                disabled={approveSwapMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant={reviewAction === "approve" ? "default" : "destructive"}
                onClick={handleSwapApproval}
                disabled={approveSwapMutation.isPending}
              >
                {approveSwapMutation.isPending
                  ? "Processing..."
                  : reviewAction === "approve"
                    ? "Approve"
                    : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Time Off Review Dialog */}
      {reviewingTimeOff && (
        <Dialog
          open={!!reviewingTimeOff}
          onOpenChange={() => {
            setReviewingTimeOff(null);
            setRejectionReason("");
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {reviewAction === "approve" ? "Approve" : "Reject"} Time Off
              </DialogTitle>
              <DialogDescription>
                {reviewAction === "approve"
                  ? `Approve ${reviewingTimeOff.type.toLowerCase().replace("_", " ")} request from ${reviewingTimeOff.worker.name}`
                  : "Provide a reason for rejecting this time off request"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-primary/60">Worker:</span>
                  <span>{reviewingTimeOff.worker.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary/60">Type:</span>
                  <span>{reviewingTimeOff.type.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary/60">Dates:</span>
                  <span>
                    {format(reviewingTimeOff.startDate, "PP")} -{" "}
                    {format(reviewingTimeOff.endDate, "PP")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary/60">Duration:</span>
                  <span>
                    {Number(reviewingTimeOff.totalDays)} day
                    {Number(reviewingTimeOff.totalDays) !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {reviewAction === "reject" && (
                <Textarea
                  placeholder="Reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setReviewingTimeOff(null);
                  setRejectionReason("");
                }}
                disabled={approveTimeOffMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant={reviewAction === "approve" ? "default" : "destructive"}
                onClick={handleTimeOffApproval}
                disabled={approveTimeOffMutation.isPending}
              >
                {approveTimeOffMutation.isPending
                  ? "Processing..."
                  : reviewAction === "approve"
                    ? "Approve"
                    : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
