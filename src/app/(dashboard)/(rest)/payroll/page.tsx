"use client";

import { Suspense } from "react";
import { LoaderCircle } from "lucide-react";
import { PayrollDashboard } from "@/features/payroll/components/payroll-dashboard";

export default function PayrollPage() {
  return (
    <Suspense
      fallback={
        <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground text-sm text-primary flex items-center justify-center gap-3 p-6">
          <LoaderCircle className="size-3.5 animate-spin" />
          Loading payroll...
        </div>
      }
    >
      <PayrollDashboard />
    </Suspense>
  );
}
