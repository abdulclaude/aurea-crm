import { notFound } from "next/navigation";

import { REPORT_CATEGORIES } from "@/features/reports/constants";
import { ReportGroupOverview } from "@/features/reports/components";
import {
  getReportGroup,
  getReportsForGroup,
  isReportGroupId,
} from "@/features/reports/helpers";

export default async function ReportGroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  if (!isReportGroupId(groupId)) {
    notFound();
  }

  const group = getReportGroup(groupId);
  if (!group) {
    notFound();
  }

  return (
    <ReportGroupOverview
      categories={REPORT_CATEGORIES[groupId]}
      group={group}
      reports={getReportsForGroup(groupId)}
    />
  );
}
