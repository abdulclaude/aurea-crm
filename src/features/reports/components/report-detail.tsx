import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  getReportFields,
  toReportSentenceCase,
} from "@/features/reports/helpers";
import type { ReportCatalogItem, ReportGroup } from "@/features/reports/types";

import { ReportDataTable } from "./report-data-table";

type ReportDetailProps = {
  group: ReportGroup;
  report: ReportCatalogItem;
};

export function ReportDetail({ group, report }: ReportDetailProps) {
  const fields = getReportFields(report);

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-4 p-6 pb-6">
        <div className="max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{group.label}</Badge>
            <Badge variant="outline">
              {toReportSentenceCase(report.category)}
            </Badge>
          </div>
          <h1 className="text-lg font-semibold text-primary">
            {toReportSentenceCase(report.name)}
          </h1>
          <p className="text-xs leading-5 text-primary/75">
            {report.description}
          </p>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <div className="space-y-4">
        <ReportDataTable
          fields={fields}
          groupId={group.id}
          reportId={report.id}
          reportName={toReportSentenceCase(report.name)}
        />
      </div>
    </div>
  );
}
