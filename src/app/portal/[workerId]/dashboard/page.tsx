"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { IconClock as ClockIcon } from "central-icons/IconClock";
import { LogOut, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useWorkerProfile } from "@/features/workers/hooks/use-workers";
import { useTRPC } from "@/trpc/client";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatDuration(startTime: Date): string {
  const now = new Date();
  const diff = now.getTime() - startTime.getTime();
  const hours = Math.floor(diff / 1000 / 60 / 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function WorkerDashboardPage({
  params,
}: {
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = use(params);
  const router = useRouter();
  const trpc = useTRPC();
  const [workerSession, setWorkerSession] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [duration, setDuration] = useState<string>("00:00:00");

  // Check for worker session
  useEffect(() => {
    const session = localStorage.getItem("workerSession");
    if (!session) {
      router.push(`/portal/${workerId}/auth`);
      return;
    }

    const parsed = JSON.parse(session);
    if (parsed.workerId !== workerId) {
      router.push(`/portal/${workerId}/auth`);
      return;
    }

    setWorkerSession(parsed);
  }, [workerId, router]);

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(format(new Date(), "h:mm:ss a"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: profile } = useWorkerProfile(workerId);

  const { data: activeTimeLog, refetch: refetchActive } = useSuspenseQuery(
    trpc.timeTracking.getActiveTimeLog.queryOptions({
      workerId,
    })
  );

  const { data: recentTimeLogs, refetch: refetchRecent } = useSuspenseQuery(
    trpc.timeTracking.list.queryOptions({
      limit: 5,
      workerId,
    })
  );

  // Update duration timer
  useEffect(() => {
    if (!activeTimeLog) return;

    const timer = setInterval(() => {
      setDuration(formatDuration(new Date(activeTimeLog.startTime)));
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTimeLog]);

  const clockInMutation = useMutation(
    trpc.timeTracking.clockIn.mutationOptions({
      onSuccess: () => {
        toast.success("Clocked in successfully!");
        refetchActive();
        refetchRecent();
      },
      onError: (error: any) => {
        toast.error(error.message);
      },
    })
  );

  const clockOutMutation = useMutation(
    trpc.timeTracking.clockOut.mutationOptions({
      onSuccess: () => {
        toast.success("Clocked out successfully!");
        refetchActive();
        refetchRecent();
      },
      onError: (error: any) => {
        toast.error(error.message);
      },
    })
  );

  const handleClockIn = () => {
    clockInMutation.mutate({
      workerId,
      checkInMethod: "MANUAL",
    });
  };

  const handleClockOut = () => {
    if (!activeTimeLog) return;
    clockOutMutation.mutate({
      workerId,
      timeLogId: activeTimeLog.id,
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("workerSession");
    router.push(`/portal/${workerId}/auth`);
  };

  if (!workerSession || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white dark:bg-black/20 border-b border-black/5 dark:border-white/5">
        <div className="max-w-4xl mx-auto p-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-primary">Worker Portal</h1>
            <p className="text-xs text-primary/60">Welcome, {profile.name}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="size-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Current Time */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-primary/60 mb-2">Current Time</p>
              <p className="text-3xl font-mono font-bold text-primary">
                {currentTime}
              </p>
              <p className="text-xs text-primary/40 mt-2">
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Clock In/Out */}
        {activeTimeLog ? (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-500">
                <ClockIcon className="size-5" />
                Currently Clocked In
              </CardTitle>
              <CardDescription>
                Started at {format(new Date(activeTimeLog.startTime), "h:mm a")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-4">
                <p className="text-sm text-primary/60 mb-2">Elapsed Time</p>
                <p className="text-4xl font-mono font-bold text-primary">
                  {duration}
                </p>
              </div>

              <Button
                onClick={handleClockOut}
                disabled={clockOutMutation.isPending}
                className="w-full"
                size="lg"
                variant="destructive"
              >
                <Clock className="size-4 mr-2" />
                {clockOutMutation.isPending ? "Clocking out..." : "Clock Out"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Ready to start?</CardTitle>
              <CardDescription>
                Click the button below to clock in and start tracking your time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleClockIn}
                disabled={clockInMutation.isPending}
                className="w-full"
                size="lg"
              >
                <ClockIcon className="size-4 mr-2" />
                {clockInMutation.isPending ? "Clocking in..." : "Clock In"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your last 5 time entries</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTimeLogs?.items.length === 0 ? (
              <p className="text-sm text-primary/60 text-center py-8">
                No time entries yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentTimeLogs?.items.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-primary-foreground/50 border border-black/5 dark:border-white/5"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">
                          {format(new Date(log.startTime), "MMM d, yyyy")}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            log.status === "APPROVED" &&
                              "bg-green-500/10 text-green-500 border-green-500/20",
                            log.status === "SUBMITTED" &&
                              "bg-blue-500/10 text-blue-500 border-blue-500/20",
                            log.status === "REJECTED" &&
                              "bg-red-500/10 text-red-500 border-red-500/20"
                          )}
                        >
                          {log.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-primary/60">
                        {format(new Date(log.startTime), "h:mm a")} -{" "}
                        {log.endTime
                          ? format(new Date(log.endTime), "h:mm a")
                          : "In Progress"}
                      </p>
                    </div>
                    {log.duration && (
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {Math.floor(log.duration / 60)}h {log.duration % 60}m
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
