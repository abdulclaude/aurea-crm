"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { usePayrollReportingController } from "@/features/payroll/hooks/use-payroll-reporting-controller";
import { useTRPC } from "@/trpc/client";

import { PayrollDashboard } from "./payroll-dashboard";

export function PayrollReportingShell(): React.JSX.Element {
  const trpc = useTRPC();
  const controller = usePayrollReportingController();
  const { data: permissions } = useSuspenseQuery(
    trpc.permissions.getCurrent.queryOptions(),
  );
  const canManage = permissions.capabilities.includes("reports.manage");

  return (
    <div>
      <div className="flex items-end justify-between gap-3 p-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">
            Payroll reporting
          </h1>
          <p className="mt-1 text-xs text-primary/75">
            Review approved hours and prepare payroll runs.
          </p>
        </div>
        {canManage ? (
          <Button
            size="sm"
            onClick={controller.createPayrollRun}
            disabled={controller.isCreating}
          >
            <Plus className="size-3.5" />
            Create payroll run
          </Button>
        ) : null}
      </div>
      <Separator className="bg-black/5 dark:bg-white/5" />
      <PayrollDashboard canManage={canManage} controller={controller} />
    </div>
  );
}
