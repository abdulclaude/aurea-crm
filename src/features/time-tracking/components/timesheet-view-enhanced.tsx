"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { TimesheetTable } from "./timesheet-table";

function formatCurrency(amount: number, currency?: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "GBP",
  }).format(amount);
}

export function TimesheetViewEnhanced() {
  const trpc = useTRPC();

  // Get timesheet summary data
  const { data: timesheetData } = useSuspenseQuery(
    trpc.timeTracking.getTimesheet.queryOptions({})
  );

  return (
    <div className=" space-y-6">
      {/* Filters */}
      <div className="rounded-none shadow-none border-b border-black/5 border-l-none">
        <div className="space-y-4 h-full px-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3 h-full">
            <div className="space-y-1 border-r border-black/5 h-full py-8 text-center">
              <p className="text-xs text-primary/60">Total Hours</p>
              <p className="text-2xl font-semibold text-primary">
                {timesheetData?.totalHours.toFixed(2) || 0}h
              </p>
            </div>

            <div className="space-y-1 border-r border-black/5 h-full py-8 text-center">
              <p className="text-xs text-primary/60">Total Amount</p>
              <p className="text-2xl font-semibold text-primary">
                {formatCurrency(timesheetData?.totalAmount || 0)}
              </p>
            </div>

            <div className="space-y-1 h-full py-8 text-center">
              <p className="text-xs text-primary/60">Time Logs</p>
              <p className="text-2xl font-semibold text-primary">
                {timesheetData?.timeLogs.length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Time Logs Table with Toolbar */}
      <TimesheetTable />
    </div>
  );
}
