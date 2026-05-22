"use client";

import { Separator } from "@/components/ui/separator";
import { MyEarningsTable } from "@/features/instructors/components/my-earnings-table";

export default function MyEarningsPage() {
  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-2 p-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Earnings</h1>
          <p className="text-xs text-primary/75">
            Track your class hours and earnings
          </p>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <MyEarningsTable />
    </div>
  );
}
