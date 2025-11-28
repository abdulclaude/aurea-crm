import { LoaderCircle } from "lucide-react";
import { Suspense } from "react";

import { TimeLogsTable } from "@/features/time-tracking/components/time-logs-table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

import { IconCalendarClock4 as ClockIcon } from "central-icons/IconCalendarClock4";
import { IconScript as ReportIcon } from "central-icons/IconScript";
import Link from "next/link";

export default async function TimeLogsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2 p-6 pb-0">
        <div>
          <h1 className="text-lg font-semibold text-primary">Time Logs</h1>
          <p className="text-xs text-primary/75">
            Track employee hours, shifts, and billable time
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-primary px-2! h-8.5! "
            asChild
          >
            <Link href="/time-logs/timesheet">
              <ReportIcon className="size-3.5" />
              Timesheet Report
            </Link>
          </Button>

          <Button variant="outline" size="sm" className="h-8.5!" asChild>
            <Link href="/time-logs/clock-in">
              <ClockIcon className="size-3.5" />
              Clock In
            </Link>
          </Button>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <Suspense
        fallback={
          <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground p-6 text-sm text-primary flex items-center justify-center gap-3">
            <LoaderCircle className="size-3.5 animate-spin" />
            Loading time logs...
          </div>
        }
      >
        <TimeLogsTable />
      </Suspense>
    </div>
  );
}
