"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { IconPeopleAdd as UserPlusIcon } from "central-icons/IconPeopleAdd";
import { LoaderCircle, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";
import { RolePermissionsTable } from "@/features/organizations/components/role-permissions-table";
import { PayrollDashboard } from "@/features/payroll/components/payroll-dashboard";
import { usePayrollReportingController } from "@/features/payroll/hooks/use-payroll-reporting-controller";
import { PayRateTemplatesEmptyState } from "@/features/staff/components/pay-rate-templates-empty-state";
import { StaffPayRatesTable } from "@/features/staff/components/staff-pay-rates-table";
import { StaffTable } from "@/features/staff/components/staff-table";
import { useTRPC } from "@/trpc/client";

export default function TeamPage() {
  const trpc = useTRPC();
  const { data: active } = useSuspenseQuery(
    trpc.organizations.getActive.queryOptions(),
  );
  const { data: permissions } = useSuspenseQuery(
    trpc.permissions.getCurrent.queryOptions(),
  );
  const isWorkspaceLevel = !active?.activeLocationId;
  const canManage = permissions.capabilities.includes("team.manage");
  const canViewReports = permissions.capabilities.includes("reports.view");
  const canManageReports = permissions.capabilities.includes("reports.manage");
  const [activeTab, setActiveTab] = useState("team");
  const payrollController = usePayrollReportingController();
  const isReporting = activeTab === "reporting";

  const tabs = [
    { id: "team", label: "Team" },
    ...(canViewReports
      ? [
          { id: "pay-rates", label: "Pay rates" },
          { id: "pay-rate-templates", label: "Pay rate templates" },
          { id: "reporting", label: "Reporting" },
        ]
      : []),
    { id: "roles-permissions", label: "Roles & permissions" },
  ];

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-2 p-6 pb-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">
            {isReporting ? "Payroll reporting" : "Team"}
          </h1>
          <p className="text-xs text-primary/75">
            {isReporting
              ? "Review approved hours and prepare payroll runs."
              : "Manage team member profiles, pictures, and roles."}
          </p>
        </div>
        {isReporting && canManageReports ? (
          <Button
            size="sm"
            onClick={payrollController.createPayrollRun}
            disabled={payrollController.isCreating}
          >
            <Plus className="size-3.5" />
            Create payroll run
          </Button>
        ) : canManage && activeTab === "team" ? (
          <Button variant="outline" size="sm" asChild>
            <Link href="/team/new">
              <UserPlusIcon className="size-3.5" />
              Add staff
            </Link>
          </Button>
        ) : null}
      </div>
      <Separator className="bg-black/5 dark:bg-white/5" />
      <PageTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="px-6"
        ariaLabel="Team management sections"
        idPrefix="team-sections"
      />
      <div
        role="tabpanel"
        id={`team-sections-${activeTab}-panel`}
        aria-labelledby={`team-sections-${activeTab}-tab`}
      >
        <Suspense
          fallback={
            <div
              role="status"
              aria-live="polite"
              className="flex items-center justify-center gap-3 border-y border-black/5 bg-primary-foreground p-6 text-sm text-primary dark:border-white/5"
            >
              <LoaderCircle
                aria-hidden="true"
                className="size-3.5 animate-spin motion-reduce:animate-none"
              />
              {isReporting
                ? "Loading payroll reporting..."
                : "Loading staff..."}
            </div>
          }
        >
          {activeTab === "team" ? (
            <StaffTable
              canManage={canManage}
              scope={isWorkspaceLevel ? "all-locations" : "studio"}
            />
          ) : activeTab === "pay-rates" ? (
            <StaffPayRatesTable
              canManage={canManage}
              scope={isWorkspaceLevel ? "all-locations" : "studio"}
            />
          ) : activeTab === "pay-rate-templates" ? (
            <PayRateTemplatesEmptyState />
          ) : activeTab === "reporting" ? (
            <PayrollDashboard
              canManage={canManageReports}
              controller={payrollController}
            />
          ) : (
            <RolePermissionsTable />
          )}
        </Suspense>
      </div>
    </div>
  );
}
