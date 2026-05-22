"use client";

import { useMemo, useState } from "react";

import { PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";
import { toReportSentenceCase } from "@/features/reports/helpers";
import type { ReportCatalogItem, ReportGroup } from "@/features/reports/types";

import { ReportCatalogTable } from "./report-catalog-table";

type ReportGroupOverviewProps = {
  categories: readonly string[];
  group: ReportGroup;
  reports: readonly ReportCatalogItem[];
};

const allCategoryId = "all";

export function ReportGroupOverview({
  categories,
  group,
  reports,
}: ReportGroupOverviewProps) {
  const [activeCategory, setActiveCategory] = useState(allCategoryId);

  const tabs = useMemo(
    () => [
      { id: allCategoryId, label: "All reports" },
      ...categories.slice(1).map((category) => ({
        id: category,
        label: toReportSentenceCase(category),
      })),
    ],
    [categories],
  );

  const filteredReports = useMemo(() => {
    if (activeCategory === allCategoryId) return reports;
    return reports.filter((report) => report.category === activeCategory);
  }, [activeCategory, reports]);

  return (
    <div className="space-y-0">
      <div className="p-6 pb-6">
        <h1 className="text-lg font-semibold text-primary">
          {group.label}
        </h1>
        <p className="text-xs text-primary/75">{group.description}</p>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <PageTabs
        tabs={tabs}
        activeTab={activeCategory}
        onTabChange={setActiveCategory}
        className="px-6"
      />

      <Separator className="bg-black/5 dark:bg-white/5" />

      <ReportCatalogTable
        reports={filteredReports}
        getReportHref={(report) => `/reports/${group.id}/${report.id}`}
      />
    </div>
  );
}
