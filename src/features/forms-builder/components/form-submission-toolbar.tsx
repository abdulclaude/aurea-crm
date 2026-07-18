"use client";

import type {
  ColumnOrderState,
  Table,
  VisibilityState,
} from "@tanstack/react-table";

import { StudioTableToolbar } from "@/features/studio/components/studio-table-toolbar";
import type { FormSubmissionRow } from "./form-submission-columns";

const CLIENT_STATUS_OPTIONS = [
  { value: "RESOLVED", label: "Linked" },
  { value: "REVIEW", label: "Needs review" },
  { value: "FAILED", label: "Failed" },
  { value: "PENDING", label: "Pending" },
  { value: "RESOLVING", label: "Resolving" },
  { value: "NOT_CONFIGURED", label: "Not configured" },
] as const;
const AUTOMATION_STATUS_OPTIONS = [
  { value: "DISPATCHED", label: "Dispatched" },
  { value: "PENDING", label: "Pending" },
  { value: "DISPATCHING", label: "Dispatching" },
  { value: "FAILED", label: "Failed" },
] as const;

export type FormSubmissionClientStatus =
  (typeof CLIENT_STATUS_OPTIONS)[number]["value"];
export type FormSubmissionAutomationStatus =
  (typeof AUTOMATION_STATUS_OPTIONS)[number]["value"];
export type FormSubmissionSort = "submitted.desc" | "submitted.asc";

export function FormSubmissionToolbar({
  search,
  onSearchChange,
  clientStatuses,
  onClientStatusesChange,
  automationStatuses,
  onAutomationStatusesChange,
  sort,
  onSortChange,
  table,
  columnVisibility,
  columnOrder,
  onColumnOrderChange,
  initialColumnOrder,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  clientStatuses: FormSubmissionClientStatus[];
  onClientStatusesChange: (value: FormSubmissionClientStatus[]) => void;
  automationStatuses: FormSubmissionAutomationStatus[];
  onAutomationStatusesChange: (
    value: FormSubmissionAutomationStatus[],
  ) => void;
  sort: FormSubmissionSort;
  onSortChange: (value: FormSubmissionSort) => void;
  table: Table<FormSubmissionRow>;
  columnVisibility: VisibilityState;
  columnOrder: ColumnOrderState;
  onColumnOrderChange: (value: ColumnOrderState) => void;
  initialColumnOrder: ColumnOrderState;
}) {
  return (
    <StudioTableToolbar
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search respondents or sources..."
      filterGroups={[
        {
          label: "Member",
          options: [...CLIENT_STATUS_OPTIONS],
          selectedValues: clientStatuses,
          onChange: (values) =>
            onClientStatusesChange(values.filter(isClientStatus)),
        },
        {
          label: "Automation",
          options: [...AUTOMATION_STATUS_OPTIONS],
          selectedValues: automationStatuses,
          onChange: (values) =>
            onAutomationStatusesChange(values.filter(isAutomationStatus)),
        },
      ]}
      sortOptions={[
        { value: "submitted.desc", label: "Newest submitted" },
        { value: "submitted.asc", label: "Oldest submitted" },
      ]}
      sortValue={sort}
      onSortChange={(value) =>
        onSortChange(
          value === "submitted.asc" ? "submitted.asc" : "submitted.desc",
        )
      }
      table={table}
      columnVisibility={columnVisibility}
      columnOrder={columnOrder}
      onColumnOrderChange={onColumnOrderChange}
      initialColumnOrder={initialColumnOrder}
      primaryColumnId="submitted"
    />
  );
}

function isClientStatus(value: string): value is FormSubmissionClientStatus {
  return CLIENT_STATUS_OPTIONS.some((option) => option.value === value);
}

function isAutomationStatus(
  value: string,
): value is FormSubmissionAutomationStatus {
  return AUTOMATION_STATUS_OPTIONS.some((option) => option.value === value);
}
