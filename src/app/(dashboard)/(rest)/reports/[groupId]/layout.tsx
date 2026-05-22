import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ReportsGroupShell } from "@/features/reports/components";
import {
  getReportGroup,
  getReportsForGroup,
  isReportGroupId,
} from "@/features/reports/helpers";

export default async function ReportsGroupLayout({
  children,
  params,
}: {
  children: ReactNode;
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
    <ReportsGroupShell group={group} reports={getReportsForGroup(groupId)}>
      {children}
    </ReportsGroupShell>
  );
}
