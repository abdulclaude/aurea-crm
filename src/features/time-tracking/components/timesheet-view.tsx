"use client";

import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTRPC } from "@/trpc/client";
import {
  format,
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfDay,
  endOfDay,
} from "date-fns";
import { Download, Calendar } from "lucide-react";
import { toast } from "sonner";
import { TimeLogStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatCurrency(amount: number, currency?: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

type DateRange = "today" | "this_week" | "last_week" | "this_month";

export function TimesheetView() {
  const trpc = useTRPC();
  const [contactId, setContactId] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<DateRange>("this_week");

  // Get contacts (workers)
  const { data: contactsData } = useSuspenseQuery(
    trpc.contacts.list.queryOptions({ limit: 100 })
  );

  // Calculate date range
  const getDateRange = (range: DateRange) => {
    const now = new Date();
    switch (range) {
      case "today":
        return { startDate: startOfDay(now), endDate: endOfDay(now) };
      case "this_week":
        return { startDate: startOfWeek(now), endDate: endOfWeek(now) };
      case "last_week": {
        const lastWeek = subWeeks(now, 1);
        return {
          startDate: startOfWeek(lastWeek),
          endDate: endOfWeek(lastWeek),
        };
      }
      case "this_month": {
        return {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        };
      }
      default:
        return { startDate: startOfWeek(now), endDate: endOfWeek(now) };
    }
  };

  const { startDate, endDate } = getDateRange(dateRange);

  // Get timesheet data
  const { data: timesheetData } = useSuspenseQuery(
    trpc.timeTracking.getTimesheet.queryOptions({
      contactId,
      startDate,
      endDate,
    })
  );

  const handleExportPDF = async () => {
    try {
      // For now, we'll create a simple HTML representation
      // In a production app, you'd use a proper PDF library like jsPDF or react-pdf
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Please allow popups to export PDF");
        return;
      }

      const contact = contactsData?.items.find((c) => c.id === contactId);
      const contactName = contact?.name || "All Workers";

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Timesheet Report - ${contactName}</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                padding: 40px;
                max-width: 1000px;
                margin: 0 auto;
              }
              h1 {
                color: #1a1a1a;
                margin-bottom: 8px;
              }
              .subtitle {
                color: #666;
                margin-bottom: 32px;
              }
              .summary {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                margin-bottom: 32px;
              }
              .summary-card {
                background: #f9f9f9;
                padding: 16px;
                border-radius: 8px;
              }
              .summary-label {
                font-size: 12px;
                color: #666;
                text-transform: uppercase;
                margin-bottom: 8px;
              }
              .summary-value {
                font-size: 24px;
                font-weight: 600;
                color: #1a1a1a;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              th {
                background: #f5f5f5;
                padding: 12px;
                text-align: left;
                font-size: 12px;
                font-weight: 600;
                color: #666;
                border-bottom: 2px solid #e0e0e0;
              }
              td {
                padding: 12px;
                border-bottom: 1px solid #f0f0f0;
                font-size: 14px;
              }
              .status-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 500;
              }
              .status-approved {
                background: #d4edda;
                color: #155724;
              }
              .status-submitted {
                background: #d1ecf1;
                color: #0c5460;
              }
              .status-draft {
                background: #e2e3e5;
                color: #383d41;
              }
              @media print {
                body {
                  padding: 20px;
                }
              }
            </style>
          </head>
          <body>
            <h1>Timesheet Report</h1>
            <p class="subtitle">
              ${contactName} • ${format(startDate, "MMM d, yyyy")} - ${format(
        endDate,
        "MMM d, yyyy"
      )}
            </p>

            <div class="summary">
              <div class="summary-card">
                <div class="summary-label">Total Hours</div>
                <div class="summary-value">${
                  timesheetData?.totalHours.toFixed(2) || 0
                }h</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Total Amount</div>
                <div class="summary-value">${formatCurrency(
                  timesheetData?.totalAmount || 0
                )}</div>
              </div>
              <div class="summary-card">
                <div class="summary-label">Time Logs</div>
                <div class="summary-value">${
                  timesheetData?.timeLogs.length || 0
                }</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Worker</th>
                  <th>Job/Deal</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Duration</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${
                  timesheetData?.timeLogs
                    .map(
                      (log) => `
                  <tr>
                    <td>${format(new Date(log.startTime), "MMM d, yyyy")}</td>
                    <td>${log.contact?.name || "—"}</td>
                    <td>${log.deal?.name || "—"}</td>
                    <td>${format(new Date(log.startTime), "h:mm a")}</td>
                    <td>${
                      log.endTime
                        ? format(new Date(log.endTime), "h:mm a")
                        : "—"
                    }</td>
                    <td>${
                      log.duration ? formatDuration(log.duration) : "—"
                    }</td>
                    <td>${
                      log.totalAmount
                        ? formatCurrency(
                            Number(log.totalAmount),
                            log.currency || undefined
                          )
                        : "—"
                    }</td>
                    <td>
                      <span class="status-badge status-${log.status.toLowerCase()}">
                        ${log.status}
                      </span>
                    </td>
                  </tr>
                `
                    )
                    .join("") ||
                  '<tr><td colspan="8">No time logs found</td></tr>'
                }
              </tbody>
            </table>

            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export timesheet");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Configure your timesheet report</CardDescription>
        </CardHeader>
      </Card>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Hours</CardDescription>
            <CardTitle className="text-3xl">
              {timesheetData?.totalHours.toFixed(2) || 0}h
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Amount</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(timesheetData?.totalAmount || 0)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Time Logs</CardDescription>
            <CardTitle className="text-3xl">
              {timesheetData?.timeLogs.length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button onClick={handleExportPDF} variant="secondary">
          <Download className="mr-2 h-4 w-4" />
          Export to PDF
        </Button>
      </div>

      {/* Time Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Time Logs</CardTitle>
          <CardDescription>
            Detailed breakdown of all time logs in this period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-3 text-xs font-medium text-primary/60">
                    Date
                  </th>
                  <th className="pb-3 text-xs font-medium text-primary/60">
                    Worker
                  </th>
                  <th className="pb-3 text-xs font-medium text-primary/60">
                    Job/Deal
                  </th>
                  <th className="pb-3 text-xs font-medium text-primary/60">
                    Start
                  </th>
                  <th className="pb-3 text-xs font-medium text-primary/60">
                    End
                  </th>
                  <th className="pb-3 text-xs font-medium text-primary/60">
                    Duration
                  </th>
                  <th className="pb-3 text-xs font-medium text-primary/60">
                    Amount
                  </th>
                  <th className="pb-3 text-xs font-medium text-primary/60">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {timesheetData?.timeLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 text-xs">
                      {format(new Date(log.startTime), "MMM d, yyyy")}
                    </td>
                    <td className="py-3 text-xs">{log.contact?.name || "—"}</td>
                    <td className="py-3 text-xs">{log.deal?.name || "—"}</td>
                    <td className="py-3 text-xs">
                      {format(new Date(log.startTime), "h:mm a")}
                    </td>
                    <td className="py-3 text-xs">
                      {log.endTime
                        ? format(new Date(log.endTime), "h:mm a")
                        : "—"}
                    </td>
                    <td className="py-3 text-xs font-medium">
                      {log.duration ? formatDuration(log.duration) : "—"}
                    </td>
                    <td className="py-3 text-xs font-medium">
                      {log.totalAmount
                        ? formatCurrency(
                            Number(log.totalAmount),
                            log.currency || undefined
                          )
                        : "—"}
                    </td>
                    <td className="py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          log.status === TimeLogStatus.APPROVED &&
                            "bg-green-500/10 text-green-500 border-green-500/20",
                          log.status === TimeLogStatus.SUBMITTED &&
                            "bg-blue-500/10 text-blue-500 border-blue-500/20",
                          log.status === TimeLogStatus.DRAFT &&
                            "bg-gray-500/10 text-gray-500 border-gray-500/20"
                        )}
                      >
                        {log.status}
                      </Badge>
                    </td>
                  </tr>
                ))}

                {timesheetData?.timeLogs.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-sm text-primary/60"
                    >
                      No time logs found for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
