"use client";

import { use, useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  DollarSign,
  TrendingUp,
  Filter,
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
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  DRAFT: {
    label: "Working",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  SUBMITTED: {
    label: "Submitted",
    color: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  },
  APPROVED: {
    label: "Approved",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  REJECTED: {
    label: "Rejected",
    color: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  },
  INVOICED: {
    label: "Invoiced",
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
};

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export default function WorkerTimeLogsPage({
  params,
}: {
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = use(params);
  const trpc = useTRPC();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: timeLogsData } = useSuspenseQuery(
    trpc.workers.getTimeLogs.queryOptions({
      workerId,
      startDate: monthStart,
      endDate: monthEnd,
    })
  );

  const timeLogs = timeLogsData?.items || [];

  // Filter by status
  const filteredLogs = timeLogs.filter((log) => {
    if (filterStatus === "all") return true;
    return log.status === filterStatus;
  });

  // Calculate stats
  const stats = {
    totalEntries: timeLogs.length,
    totalMinutes: timeLogs.reduce((acc, log) => acc + (log.duration || 0), 0),
    totalEarnings: timeLogs
      .filter((log) => log.status === "APPROVED" || log.status === "INVOICED")
      .reduce((acc, log) => acc + Number(log.totalAmount || 0), 0),
    approvedCount: timeLogs.filter((log) => log.status === "APPROVED").length,
    pendingCount: timeLogs.filter((log) => log.status === "SUBMITTED").length,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Time Logs</h1>
          <p className="text-sm text-primary/60">
            View your work history and earnings
          </p>
        </div>
      </div>

      {/* Month Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-2xl font-bold">
              <Clock className="size-5 text-primary/60" />
              {formatDuration(stats.totalMinutes)}
            </div>
            <p className="text-sm text-primary/60">Total Time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-2xl font-bold text-emerald-500">
              <DollarSign className="size-5" />
              {stats.totalEarnings.toFixed(2)}
            </div>
            <p className="text-sm text-primary/60">Approved Earnings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalEntries}</div>
            <p className="text-sm text-primary/60">Total Entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-sky-500">{stats.pendingCount}</div>
            <p className="text-sm text-primary/60">Pending Review</p>
          </CardContent>
        </Card>
      </div>

      {/* Time Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>

              <div className="text-center">
                <div className="font-semibold">
                  {format(currentMonth, "MMMM yyyy")}
                </div>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
              >
                This Month
              </Button>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="size-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="DRAFT">Working</SelectItem>
                  <SelectItem value="SUBMITTED">Submitted</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="INVOICED">Invoiced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="size-12 mx-auto text-primary/20 mb-4" />
              <h3 className="text-lg font-medium text-primary">No time logs found</h3>
              <p className="text-sm text-primary/60 mt-1">
                {filterStatus === "all"
                  ? "You don't have any time logs for this month"
                  : "No time logs match the selected filter"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs
                  .sort(
                    (a, b) =>
                      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
                  )
                  .map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="font-medium">
                          {format(new Date(log.startTime), "EEE, d MMM")}
                        </div>
                        <div className="text-xs text-primary/60">
                          {format(new Date(log.startTime), "yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(log.startTime), "h:mm a")}
                          {log.endTime && (
                            <> - {format(new Date(log.endTime), "h:mm a")}</>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.duration ? (
                          <span className="font-medium">
                            {formatDuration(log.duration)}
                          </span>
                        ) : (
                          <span className="text-primary/40">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <div className="font-medium truncate">
                            {log.title || "Time Entry"}
                          </div>
                          {log.description && (
                            <div className="text-xs text-primary/60 truncate">
                              {log.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            STATUS_CONFIG[log.status as keyof typeof STATUS_CONFIG]?.color
                          )}
                        >
                          {STATUS_CONFIG[log.status as keyof typeof STATUS_CONFIG]?.label ||
                            log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {log.totalAmount ? (
                          <span className="font-medium">
                            {log.currency || "GBP"} {Number(log.totalAmount).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-primary/40">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Monthly Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5" />
            Monthly Summary
          </CardTitle>
          <CardDescription>
            Breakdown of your time entries for {format(currentMonth, "MMMM yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(
              timeLogs.reduce((acc, log) => {
                const status = log.status;
                if (!acc[status]) {
                  acc[status] = { count: 0, minutes: 0, amount: 0 };
                }
                acc[status].count += 1;
                acc[status].minutes += log.duration || 0;
                acc[status].amount += Number(log.totalAmount || 0);
                return acc;
              }, {} as Record<string, { count: number; minutes: number; amount: number }>)
            ).map(([status, data]) => (
              <div
                key={status}
                className="flex items-center justify-between p-3 rounded-lg border border-primary/10"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color
                    )}
                  >
                    {STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label || status}
                  </Badge>
                  <span className="text-sm text-primary/60">
                    {data.count} {data.count === 1 ? "entry" : "entries"}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="size-4 text-primary/40" />
                    <span className="font-medium">{formatDuration(data.minutes)}</span>
                  </div>
                  {data.amount > 0 && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="size-4 text-primary/40" />
                      <span className="font-medium">{data.amount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {timeLogs.length === 0 && (
              <div className="text-center py-8 text-primary/60">
                No time entries for this month
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
