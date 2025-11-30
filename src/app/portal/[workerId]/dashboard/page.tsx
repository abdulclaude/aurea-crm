"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { IconClockAlert as ClockIcon } from "central-icons/IconClockAlert";
import { LogOut, Clock, CheckCircle } from "lucide-react";
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

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;
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
            <h1 className="text-lg font-semibold text-primary">
              Worker Portal
            </h1>
            <p className="text-xs text-primary/60">Welcome, {profile.name}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="size-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div>
        {/* Current Time */}

        <div className="p-6">
          <div className="text-center">
            <p className="text-xs text-primary/60 mb-1">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
            <p className="text-3xl font-mono font-bold text-primary">
              {currentTime}
            </p>
          </div>
        </div>

        <Separator className="bg-black/5 dark:bg-white/5" />

        {/* Clock In/Out */}
        {activeTimeLog ? (
          <Card className=" border-none rounded-none p-0 gap-0">
            <CardHeader className="flex flex-col items-center justify-center border-green-500/20 bg-green-500/5 p-6">
              <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-500">
                <ClockIcon className="size-4" />
                Currently clocked in
              </CardTitle>
              <CardDescription>
                Started at {format(new Date(activeTimeLog.startTime), "h:mm a")}
              </CardDescription>
            </CardHeader>

            <Separator className="bg-black/5 dark:bg-white/5" />

            <CardContent className="space-y-4 flex flex-col items-center bg-background p-6">
              <div className="text-center">
                <p className="text-sm text-primary/60 mb-2">Elapsed time</p>
                <p className="text-4xl font-mono font-bold text-primary">
                  {duration}
                </p>
              </div>

              <Button
                onClick={handleClockOut}
                disabled={clockOutMutation.isPending}
                className="w-max py-1.5! px-2.5! h-max gap-1.5"
                size="lg"
                variant="destructive"
              >
                <ClockIcon className="size-3.5" />
                {clockOutMutation.isPending ? "Clocking out..." : "Clock Out"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-none border-none p-0 flex items-center justify-center gap-3.5">
            <CardHeader className="p-6 pb-0 w-[400px]">
              <CardTitle className="text-center">Ready to start?</CardTitle>

              <CardDescription className="text-center">
                Click the button below to clock in and start tracking your time
              </CardDescription>
            </CardHeader>

            <CardContent className="pb-6">
              <Button
                onClick={handleClockIn}
                disabled={clockInMutation.isPending}
                className="w-max py-1.5! px-2.5! h-max gap-1.5"
                variant="gradient"
                size="lg"
              >
                <ClockIcon className="size-3.5" />
                {clockInMutation.isPending ? "Clocking in..." : "Clock In"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card className="rounded-none shadow-none p-0 border-black/5 flex flex-col items-center justify-center">
          <CardHeader className="p-6 pb-0 text-center w-[400px]">
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your last 5 time entries</CardDescription>
          </CardHeader>

          <Separator className="bg-black/5 dark:bg-white/5" />

          <CardContent className={cn("pb-6")}>
            {recentTimeLogs?.items.length === 0 ? (
              <p className="text-sm text-primary/60 text-center py-8">
                No time entries yet
              </p>
            ) : (
              <div
                className={cn(
                  "space-y-3 flex md:flex-row flex-col gap-2 h-[70px]"
                )}
              >
                {recentTimeLogs?.items.map((log) => (
                  <div
                    key={log.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg ring ring-black/10 min-h-full w-[275px]",
                      log.status === "DRAFT" &&
                        "bg-amber-500/5 text-amber-500 ring-amber-500/20",
                      log.status === "SUBMITTED" &&
                        "bg-sky-500/5 text-sky-500 ring-sky-500/20",
                      log.status === "APPROVED" &&
                        "bg-emerald-500/5 text-emerald-500 ring-emerald-500/20",
                      log.status === "REJECTED" &&
                        "bg-rose-500/5 text-rose-500 ring-rose-500/20",
                      log.status === "INVOICED" &&
                        "bg-purple-500/5 text-purple-500 ring-purple-500/20"
                    )}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {format(new Date(log.startTime), "MMM d, yyyy")}
                        </p>
                      </div>

                      <p className="text-xs text-primary/50 font-medium">
                        {format(new Date(log.startTime), "h:mm a")} -{" "}
                        {log.endTime
                          ? format(new Date(log.endTime), "h:mm a")
                          : "In Progress"}
                      </p>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs shadow-xs",
                          log.status === "DRAFT" &&
                            "bg-amber-500/10 text-amber-500 ring-amber-500/20",
                          log.status === "SUBMITTED" &&
                            "bg-sky-500/10 text-sky-500 ring-sky-500/20",
                          log.status === "APPROVED" &&
                            "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20",
                          log.status === "REJECTED" &&
                            "bg-rose-500/10 text-rose-500 ring-rose-500/20",
                          log.status === "INVOICED" &&
                            "bg-purple-500/10 text-purple-500 ring-purple-500/20",
                          "capitalize"
                        )}
                      >
                        {log.status === "DRAFT"
                          ? "Working"
                          : log.status.toLowerCase()}
                      </Badge>

                      {log.duration! > 0 && (
                        <div className="text-right">
                          <p className="text-[12px] font-medium text-primary/60">
                            {Math.floor(log.duration! / 60)}h{" "}
                            {log.duration! % 60 > 0 && `${log.duration! % 60}m`}
                          </p>
                        </div>
                      )}
                    </div>
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
