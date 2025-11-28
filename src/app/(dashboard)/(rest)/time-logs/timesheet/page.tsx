import { Suspense } from "react";
import { LoaderCircle } from "lucide-react";
import { TimesheetViewEnhanced } from "@/features/time-tracking/components/timesheet-view-enhanced";
import { Separator } from "@/components/ui/separator";

export default async function TimesheetPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2 p-6 pb-0">
        <div>
          <h1 className="text-lg font-semibold text-primary">
            Timesheet Report
          </h1>
          <p className="text-xs text-primary/75">
            View and export time logs for reporting and invoicing
          </p>
        </div>
      </div>

      <div>
        <Separator className="bg-black/5 dark:bg-white/5" />

        <Suspense
          fallback={
            <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground p-6 text-sm text-primary flex items-center justify-center gap-3">
              <LoaderCircle className="size-3.5 animate-spin" />
              Loading timesheet...
            </div>
          }
        >
          <TimesheetViewEnhanced />
        </Suspense>
      </div>
    </div>
  );
}
