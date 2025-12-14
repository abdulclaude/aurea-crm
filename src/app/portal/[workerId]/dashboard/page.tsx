"use client";

import { use, useState, useEffect } from "react";
import { format, formatDistanceToNow, differenceInMinutes } from "date-fns";
import {
  Clock,
  PlayCircle,
  StopCircle,
  Calendar,
  TrendingUp,
  FileText,
  AlertCircle,
  CheckCircle2,
  Activity,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export default function WorkerDashboardPage({
  params,
}: {
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = use(params);
  const trpc = useTRPC();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const { data: dashboardData, refetch } = useSuspenseQuery(
    trpc.workers.getDashboard.queryOptions({ workerId })
  );

  const clockInMutation = useMutation(
    trpc.workers.clockIn.mutationOptions({
      onSuccess: () => {
        toast.success("Clocked in successfully");
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to clock in");
      },
    })
  );

  const clockOutMutation = useMutation(
    trpc.workers.clockOut.mutationOptions({
      onSuccess: () => {
        toast.success("Clocked out successfully");
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to clock out");
      },
    })
  );

  const handleClockIn = () => {
    clockInMutation.mutate({ workerId });
  };

  const handleClockOut = () => {
    if (!dashboardData?.activeTimeLog?.id) return;
    clockOutMutation.mutate({
      workerId,
      timeLogId: dashboardData.activeTimeLog.id,
    });
  };

  const worker = dashboardData?.worker;
  const activeTimeLog = dashboardData?.activeTimeLog;
  const todayShifts = dashboardData?.todayShifts || [];
  const upcomingShifts = dashboardData?.upcomingShifts || [];
  const recentTimeLogs = dashboardData?.recentTimeLogs || [];
  const pendingDocuments = dashboardData?.pendingDocuments || [];
  const expiringDocuments = dashboardData?.expiringDocuments || [];

  // Calculate current session duration
  const currentSessionMinutes = activeTimeLog
    ? differenceInMinutes(currentTime, new Date(activeTimeLog.startTime))
    : 0;

  // Week stats
  const weekStats = {
    totalHours: dashboardData?.weekStats?.totalMinutes
      ? dashboardData.weekStats.totalMinutes / 60
      : 0,
    shiftsCount: dashboardData?.weekStats?.shiftsCount || 0,
    earnings: dashboardData?.weekStats?.earnings || 0,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary">
          Welcome back, {worker?.firstName || worker?.name?.split(" ")[0] || "Worker"}!
        </h1>
        <p className="text-sm text-primary/60">
          {format(currentTime, "EEEE, d MMMM yyyy · h:mm:ss a")}
        </p>
      </div>

      {/* Alerts - Pending Documents & Expiring */}
      {(pendingDocuments.length > 0 || expiringDocuments.length > 0) && (
        <div className="space-y-3">
          {pendingDocuments.length > 0 && (
            <Alert className="border-amber-500/30 bg-amber-500/5">
              <AlertCircle className="size-4 text-amber-500" />
              <AlertDescription>
                You have {pendingDocuments.length} pending{" "}
                {pendingDocuments.length === 1 ? "document" : "documents"} to upload.{" "}
                <a
                  href={`/portal/${workerId}/documents`}
                  className="font-medium underline"
                >
                  Upload now
                </a>
              </AlertDescription>
            </Alert>
          )}
          {expiringDocuments.length > 0 && (
            <Alert className="border-orange-500/30 bg-orange-500/5">
              <AlertCircle className="size-4 text-orange-500" />
              <AlertDescription>
                You have {expiringDocuments.length}{" "}
                {expiringDocuments.length === 1 ? "document" : "documents"} expiring soon.{" "}
                <a
                  href={`/portal/${workerId}/documents`}
                  className="font-medium underline"
                >
                  View documents
                </a>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Clock In/Out Section */}
      <Card
        className={cn(
          "border-2",
          activeTimeLog
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-primary/10"
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-5" />
            Time Clock
          </CardTitle>
          <CardDescription>
            {activeTimeLog
              ? "You are currently clocked in"
              : "Click below to start tracking your time"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeTimeLog ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="size-3 bg-emerald-500 rounded-full animate-pulse" />
                    <div className="absolute inset-0 size-3 bg-emerald-500 rounded-full animate-ping" />
                  </div>
                  <div>
                    <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                      Active Session
                    </div>
                    <div className="text-xs text-primary/60">
                      Started at {format(new Date(activeTimeLog.startTime), "h:mm a")}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatDuration(currentSessionMinutes)}
                  </div>
                  <div className="text-xs text-primary/60">Current duration</div>
                </div>
              </div>

              {activeTimeLog.title && (
                <div className="text-sm">
                  <span className="text-primary/60">Working on: </span>
                  <span className="font-medium">{activeTimeLog.title}</span>
                </div>
              )}

              <Button
                onClick={handleClockOut}
                disabled={clockOutMutation.isPending}
                className="w-full"
                size="lg"
                variant="destructive"
              >
                <StopCircle className="size-5 mr-2" />
                Clock Out
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-6">
                <Clock className="size-12 mx-auto text-primary/20 mb-4" />
                <p className="text-sm text-primary/60">
                  You are not currently clocked in
                </p>
              </div>

              <Button
                onClick={handleClockIn}
                disabled={clockInMutation.isPending}
                className="w-full"
                size="lg"
              >
                <PlayCircle className="size-5 mr-2" />
                Clock In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Week Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-primary/60" />
              <div className="text-2xl font-bold">
                {weekStats.totalHours.toFixed(1)}h
              </div>
            </div>
            <p className="text-sm text-primary/60 mt-1">Hours This Week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="size-5 text-primary/60" />
              <div className="text-2xl font-bold">{weekStats.shiftsCount}</div>
            </div>
            <p className="text-sm text-primary/60 mt-1">Shifts This Week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-5 text-primary/60" />
              <div className="text-2xl font-bold">
                £{weekStats.earnings.toFixed(2)}
              </div>
            </div>
            <p className="text-sm text-primary/60 mt-1">Approved Earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Shifts */}
      {todayShifts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="size-5" />
              Today&apos;s Shifts
            </CardTitle>
            <CardDescription>Your scheduled shifts for today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayShifts.map((shift: any) => (
              <div
                key={shift.id}
                className="flex items-center justify-between p-3 rounded-lg border border-primary/10"
              >
                <div>
                  <div className="font-medium">
                    {shift.title || shift.companyName || "Shift"}
                  </div>
                  <div className="text-sm text-primary/60">
                    {format(new Date(shift.startTime), "h:mm a")} -{" "}
                    {format(new Date(shift.endTime), "h:mm a")}
                  </div>
                  {shift.location && (
                    <div className="text-xs text-primary/50">{shift.location}</div>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    shift.status === "CONFIRMED"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-blue-500/10 text-blue-500"
                  )}
                >
                  {shift.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Shifts */}
      {upcomingShifts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="size-5" />
                  Upcoming Shifts
                </CardTitle>
                <CardDescription>Your next scheduled shifts</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={`/portal/${workerId}/schedule`}>View All</a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingShifts.slice(0, 3).map((shift: any) => (
              <div
                key={shift.id}
                className="flex items-center justify-between p-3 rounded-lg border border-primary/10 hover:bg-primary/5 transition-colors"
              >
                <div>
                  <div className="font-medium text-sm">
                    {shift.title || shift.companyName || "Shift"}
                  </div>
                  <div className="text-xs text-primary/60">
                    {format(new Date(shift.startTime), "EEE, d MMM · h:mm a")}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {formatDistanceToNow(new Date(shift.startTime), { addSuffix: true })}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Time Logs */}
      {recentTimeLogs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-5" />
                  Recent Time Logs
                </CardTitle>
                <CardDescription>Your latest time entries</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={`/portal/${workerId}/time-logs`}>View All</a>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentTimeLogs.slice(0, 5).map((log: any) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-lg border border-primary/10"
              >
                <div className="flex items-center gap-3">
                  {log.status === "APPROVED" ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : log.status === "SUBMITTED" ? (
                    <Clock className="size-4 text-sky-500" />
                  ) : (
                    <Clock className="size-4 text-amber-500" />
                  )}
                  <div>
                    <div className="font-medium text-sm">
                      {log.title || "Time Entry"}
                    </div>
                    <div className="text-xs text-primary/60">
                      {format(new Date(log.startTime), "EEE, d MMM · h:mm a")}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {log.duration && (
                    <div className="font-medium text-sm">
                      {formatDuration(log.duration)}
                    </div>
                  )}
                  {log.totalAmount && (
                    <div className="text-xs text-primary/60">
                      £{Number(log.totalAmount).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <a href={`/portal/${workerId}/profile`}>
                <Clock className="size-5" />
                <span className="text-sm">My Profile</span>
              </a>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <a href={`/portal/${workerId}/documents`}>
                <FileText className="size-5" />
                <span className="text-sm">Documents</span>
              </a>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <a href={`/portal/${workerId}/schedule`}>
                <Calendar className="size-5" />
                <span className="text-sm">Schedule</span>
              </a>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
              <a href={`/portal/${workerId}/time-logs`}>
                <TrendingUp className="size-5" />
                <span className="text-sm">Time Logs</span>
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
