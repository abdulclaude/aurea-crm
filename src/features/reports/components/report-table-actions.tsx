"use client";

import type { ReportViewDefinition } from "@/features/reports/contracts";
import type { ReportGroupId } from "@/features/reports/types";

import { ReportExportControl } from "./report-export-control";
import { SavedReportViewsControl } from "./saved-report-views-control";

type ReportTableActionsProps = {
  activeViewId: string | null;
  canExport: boolean;
  canManage: boolean;
  definition: ReportViewDefinition;
  groupId: ReportGroupId;
  onApply: (id: string, definition: ReportViewDefinition) => void;
  reportId: string;
  savedViewId: string | null;
};

export function ReportTableActions(props: ReportTableActionsProps) {
  return (
    <>
      <SavedReportViewsControl
        activeViewId={props.activeViewId}
        canManage={props.canManage}
        currentDefinition={props.definition}
        groupId={props.groupId}
        onApply={props.onApply}
        reportId={props.reportId}
      />
      <ReportExportControl
        canExport={props.canExport}
        definition={props.definition}
        groupId={props.groupId}
        reportId={props.reportId}
        savedViewId={props.savedViewId}
      />
    </>
  );
}
