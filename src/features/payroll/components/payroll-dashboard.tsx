"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { PageTabs } from "@/components/ui/page-tabs";
import type { PayrollReportingController } from "@/features/payroll/hooks/use-payroll-reporting-controller";
import { useTRPC } from "@/trpc/client";

import { PayrollInstructorsTable } from "./payroll-instructors-table";
import { PayrollRunsTable } from "./payroll-runs-table";

const REPORTING_TABS = [
  { id: "overview", label: "Period overview" },
  { id: "runs", label: "Payroll runs" },
];

export function PayrollDashboard({
  canManage,
  controller,
}: {
  canManage: boolean;
  controller: PayrollReportingController;
}): React.JSX.Element {
  const trpc = useTRPC();
  const { data: payrollPreview } = useSuspenseQuery(
    trpc.payroll.calculatePayroll.queryOptions({
      periodStart: controller.selectedPeriod.start,
      periodEnd: controller.selectedPeriod.end,
    }),
  );

  return (
    <div>
      <PageTabs
        tabs={REPORTING_TABS}
        activeTab={controller.activeTab}
        onTabChange={(tab) => {
          if (tab === "overview" || tab === "runs") {
            controller.setActiveTab(tab);
          }
        }}
        className="px-6"
        ariaLabel="Payroll reporting sections"
        idPrefix="payroll-reporting"
      />

      <div
        role="tabpanel"
        id={`payroll-reporting-${controller.activeTab}-panel`}
        aria-labelledby={`payroll-reporting-${controller.activeTab}-tab`}
      >
        {controller.activeTab === "overview" ? (
          <PayrollInstructorsTable
            instructors={payrollPreview.instructors}
            summary={payrollPreview.summary}
            selectedPeriod={controller.selectedPeriod}
            onPeriodChange={controller.setSelectedPeriod}
          />
        ) : (
          <PayrollRunsTable canManage={canManage} />
        )}
      </div>
    </div>
  );
}
