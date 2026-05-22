"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import {
  getReportCategoryGroups,
  toReportSentenceCase,
} from "@/features/reports/helpers";
import type { ReportCatalogItem, ReportGroup } from "@/features/reports/types";
import { cn } from "@/lib/utils";

type ReportsGroupShellProps = {
  children: ReactNode;
  group: ReportGroup;
  reports: readonly ReportCatalogItem[];
};

export function ReportsGroupShell({
  children,
  group,
  reports,
}: ReportsGroupShellProps) {
  const pathname = usePathname();
  const reportGroups = getReportCategoryGroups(group.id, reports);

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="w-72 shrink-0 overflow-y-auto border-r border-black/5 bg-background dark:border-white/5">
        <nav className="space-y-6 p-4">
          <div className="space-y-1">
            <Link href={`/reports/${group.id}`}>
              <div
                className={cn(
                  "flex items-center gap-2.5 rounded-sm px-3 py-2 text-xs font-semibold tracking-tight transition-colors",
                  pathname === `/reports/${group.id}`
                    ? "bg-primary-foreground/75 text-primary"
                    : "text-primary/60 hover:bg-primary-foreground/75 hover:text-primary",
                )}
              >
                Overview
              </div>
            </Link>
          </div>

          {reportGroups.map((reportGroup) => (
            <div key={reportGroup.category} className="space-y-1">
              <h3 className="mb-2 px-3 text-xs font-medium text-primary/60">
                {toReportSentenceCase(reportGroup.category)}
              </h3>

              {reportGroup.reports.map((report) => {
                const href = `/reports/${group.id}/${report.id}`;
                const isActive = pathname === href;

                return (
                  <Link key={report.id} href={href}>
                    <div
                      className={cn(
                        "flex flex-col gap-1 rounded-sm px-3 py-2 text-xs font-semibold tracking-tight transition-colors",
                        isActive
                          ? "bg-primary-foreground/75 text-primary"
                          : "text-primary/60 hover:bg-primary-foreground/75 hover:text-primary",
                      )}
                    >
                      {toReportSentenceCase(report.name)}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
