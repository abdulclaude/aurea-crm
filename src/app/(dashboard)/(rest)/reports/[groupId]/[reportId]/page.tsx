import { notFound } from "next/navigation";

import { ReportDetail } from "@/features/reports/components";
import {
  getReportById,
  getReportGroup,
  isReportGroupId,
} from "@/features/reports/helpers";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ groupId: string; reportId: string }>;
}) {
  const { groupId, reportId } = await params;

  if (!isReportGroupId(groupId)) {
    notFound();
  }

  const group = getReportGroup(groupId);
  const report = getReportById(groupId, reportId);

  if (!group || !report) {
    notFound();
  }

  return <ReportDetail group={group} report={report} />;
}
