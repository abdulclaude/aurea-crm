"use client";

import { use, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  TrendingUp,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatCurrency(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export default function WorkerEarningsPage({
  params,
}: {
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = use(params);
  const trpc = useTRPC();

  // Date range selector (current month by default)
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const startDate = startOfMonth(selectedMonth);
  const endDate = endOfMonth(selectedMonth);

  const { data: earningsData } = useSuspenseQuery(
    trpc.workers.getEarnings.queryOptions({
      workerId,
      startDate,
      endDate,
    })
  );

  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: date.toISOString(),
      label: format(date, "MMMM yyyy"),
    };
  });

  const stats = earningsData?.stats;
  const timeLogs = earningsData?.timeLogs || [];
  const invoices = earningsData?.invoices || [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Earnings</h1>
          <p className="text-sm text-primary/60 mt-1">
            Track your hours, earnings, and payment status
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedMonth.toISOString()}
            onValueChange={(value) => setSelectedMonth(new Date(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="size-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="size-4 text-sky-500" />
              <span className="text-sm text-primary/60">Total Hours</span>
            </div>
            <div className="text-3xl font-bold">
              {formatDuration(stats?.totalMinutes || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="size-4 text-emerald-500" />
              <span className="text-sm text-primary/60">Total Earned</span>
            </div>
            <div className="text-3xl font-bold">
              {formatCurrency(stats?.totalEarnings || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <span className="text-sm text-primary/60">Approved</span>
            </div>
            <div className="text-3xl font-bold text-emerald-500">
              {formatCurrency(stats?.approvedEarnings || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="size-4 text-amber-500" />
              <span className="text-sm text-primary/60">Pending</span>
            </div>
            <div className="text-3xl font-bold text-amber-500">
              {formatCurrency(stats?.pendingEarnings || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hours Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hours Breakdown</CardTitle>
            <CardDescription>Time worked by status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span className="text-sm font-medium">Approved</span>
              </div>
              <div className="text-right">
                <div className="font-bold">
                  {formatDuration(stats?.approvedMinutes || 0)}
                </div>
                <div className="text-xs text-primary/60">
                  {formatCurrency(stats?.approvedEarnings || 0)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-sky-500/5 border border-sky-500/20">
              <div className="flex items-center gap-3">
                <Clock className="size-4 text-sky-500" />
                <span className="text-sm font-medium">Submitted</span>
              </div>
              <div className="text-right">
                <div className="font-bold">
                  {formatDuration(stats?.submittedMinutes || 0)}
                </div>
                <div className="text-xs text-primary/60">
                  {formatCurrency(stats?.submittedEarnings || 0)}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center gap-3">
                <FileText className="size-4 text-amber-500" />
                <span className="text-sm font-medium">Draft</span>
              </div>
              <div className="text-right">
                <div className="font-bold">
                  {formatDuration(stats?.draftMinutes || 0)}
                </div>
                <div className="text-xs text-primary/60">
                  {formatCurrency(stats?.draftEarnings || 0)}
                </div>
              </div>
            </div>

            {(stats?.overtimeMinutes || 0) > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                <div className="flex items-center gap-3">
                  <TrendingUp className="size-4 text-purple-500" />
                  <span className="text-sm font-medium">Overtime</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">
                    {formatDuration(stats?.overtimeMinutes || 0)}
                  </div>
                  <div className="text-xs text-primary/60">
                    {formatCurrency(stats?.overtimeEarnings || 0)}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Status</CardTitle>
            <CardDescription>Invoices and payments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span className="text-sm font-medium">Paid</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-emerald-500">
                  {formatCurrency(stats?.paidAmount || 0)}
                </div>
                <div className="text-xs text-primary/60">
                  {stats?.paidInvoicesCount || 0} invoice{(stats?.paidInvoicesCount || 0) !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center gap-3">
                <Clock className="size-4 text-amber-500" />
                <span className="text-sm font-medium">Pending Payment</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-amber-500">
                  {formatCurrency(stats?.pendingPaymentAmount || 0)}
                </div>
                <div className="text-xs text-primary/60">
                  {stats?.pendingInvoicesCount || 0} invoice{(stats?.pendingInvoicesCount || 0) !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-sky-500/5 border border-sky-500/20">
              <div className="flex items-center gap-3">
                <FileText className="size-4 text-sky-500" />
                <span className="text-sm font-medium">Not Yet Invoiced</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-sky-500">
                  {formatCurrency(stats?.notInvoicedAmount || 0)}
                </div>
                <div className="text-xs text-primary/60">
                  {stats?.notInvoicedLogsCount || 0} time log{(stats?.notInvoicedLogsCount || 0) !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Time Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Time Logs</CardTitle>
          <CardDescription>
            Your time entries for {format(selectedMonth, "MMMM yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timeLogs.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="size-12 mx-auto text-primary/20 mb-4" />
              <p className="text-sm text-primary/60">No time logs for this period</p>
            </div>
          ) : (
            <div className="space-y-2">
              {timeLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-primary/10 hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {log.status === "APPROVED" ? (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : log.status === "SUBMITTED" ? (
                      <Clock className="size-4 text-sky-500" />
                    ) : log.status === "REJECTED" ? (
                      <AlertCircle className="size-4 text-red-500" />
                    ) : (
                      <FileText className="size-4 text-amber-500" />
                    )}
                    <div>
                      <div className="font-medium text-sm">
                        {log.title || "Time Entry"}
                      </div>
                      <div className="text-xs text-primary/60">
                        {format(new Date(log.startTime), "EEE, d MMM · h:mm a")}
                        {log.contact && ` · ${log.contact.name}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">
                      {formatDuration(log.duration || 0)}
                    </div>
                    {log.totalAmount && (
                      <div className={cn(
                        "text-xs",
                        log.status === "APPROVED" ? "text-emerald-500" :
                        log.status === "SUBMITTED" ? "text-sky-500" :
                        "text-amber-500"
                      )}>
                        {formatCurrency(Number(log.totalAmount))}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "ml-4",
                      log.status === "APPROVED" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                      log.status === "SUBMITTED" && "bg-sky-500/10 text-sky-500 border-sky-500/20",
                      log.status === "REJECTED" && "bg-red-500/10 text-red-500 border-red-500/20",
                      log.status === "DRAFT" && "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}
                  >
                    {log.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Related Invoices</CardTitle>
            <CardDescription>
              Invoices for {format(selectedMonth, "MMMM yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invoices.map((invoice: any) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-primary/10 hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="size-4 text-primary/60" />
                    <div>
                      <div className="font-medium text-sm">
                        Invoice #{invoice.invoiceNumber}
                      </div>
                      <div className="text-xs text-primary/60">
                        Issued {format(new Date(invoice.issueDate), "d MMM yyyy")}
                        {invoice.dueDate && ` · Due ${format(new Date(invoice.dueDate), "d MMM yyyy")}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">
                      {formatCurrency(Number(invoice.total))}
                    </div>
                    {invoice.amountPaid > 0 && (
                      <div className="text-xs text-emerald-500">
                        Paid: {formatCurrency(Number(invoice.amountPaid))}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "ml-4",
                      invoice.status === "PAID" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                      invoice.status === "SENT" && "bg-sky-500/10 text-sky-500 border-sky-500/20",
                      invoice.status === "OVERDUE" && "bg-red-500/10 text-red-500 border-red-500/20",
                      invoice.status === "DRAFT" && "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}
                  >
                    {invoice.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
