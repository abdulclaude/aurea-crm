import { Suspense } from "react";
import { LoaderCircle } from "lucide-react";
import { ClockInForm } from "@/features/time-tracking/components/clock-in-form";
import { Separator } from "@/components/ui/separator";

export default async function ClockInPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-2 p-6 pb-0">
        <div>
          <h1 className="text-lg font-semibold text-primary">Clock In</h1>
          <p className="text-xs text-primary/75">
            Start tracking your time for a shift or job
          </p>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <Suspense
        fallback={
          <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground p-6 text-sm text-primary flex items-center justify-center gap-3">
            <LoaderCircle className="size-3.5 animate-spin" />
            Loading...
          </div>
        }
      >
        <ClockInForm />
      </Suspense>
    </div>
  );
}
