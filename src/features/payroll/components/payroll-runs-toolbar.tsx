"use client";

import type {
  ColumnOrderState,
  Table,
  VisibilityState,
} from "@tanstack/react-table";
import { ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  StudioTableToolbar,
  type SortOption,
} from "@/features/studio/components/studio-table-toolbar";

import { PAYROLL_RUN_COLUMN_ORDER } from "./payroll-run-columns";
import type { PayrollRunRow } from "./payroll-run-actions";

export const PAYROLL_STATUS_OPTIONS = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;
export type PayrollStatus = (typeof PAYROLL_STATUS_OPTIONS)[number];
export type PayrollRunSort =
  | "periodStart.desc"
  | "periodStart.asc"
  | "paymentDate.desc"
  | "totalNetPay.desc"
  | "status.asc";

const SORT_OPTIONS: SortOption[] = [
  { value: "periodStart.desc", label: "Newest period" },
  { value: "periodStart.asc", label: "Oldest period" },
  { value: "paymentDate.desc", label: "Latest payment date" },
  { value: "totalNetPay.desc", label: "Highest net pay" },
  { value: "status.asc", label: "Status A-Z" },
];

export function isPayrollRunSort(value: string): value is PayrollRunSort {
  return SORT_OPTIONS.some((option) => option.value === value);
}

export function PayrollRunsToolbar({
  columnOrder,
  columnVisibility,
  isMutating,
  onApproveSelected,
  onColumnOrderChange,
  onSearchChange,
  onSortChange,
  onStatusesChange,
  search,
  selectedDraftCount,
  sort,
  statuses,
  table,
}: {
  columnOrder: ColumnOrderState;
  columnVisibility: VisibilityState;
  isMutating: boolean;
  onApproveSelected: () => void;
  onColumnOrderChange: (order: ColumnOrderState) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: PayrollRunSort) => void;
  onStatusesChange: (values: PayrollStatus[]) => void;
  search: string;
  selectedDraftCount: number;
  sort: PayrollRunSort;
  statuses: PayrollStatus[];
  table: Table<PayrollRunRow>;
}): React.JSX.Element {
  return (
    <StudioTableToolbar
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search payroll runs..."
      filterGroups={[
        {
          label: "Status",
          options: PAYROLL_STATUS_OPTIONS.map((status) => ({
            value: status,
            label: status.replaceAll("_", " "),
          })),
          selectedValues: statuses,
          onChange: (values) =>
            onStatusesChange(
              values.filter((value): value is PayrollStatus =>
                PAYROLL_STATUS_OPTIONS.includes(value as PayrollStatus),
              ),
            ),
        },
      ]}
      sortOptions={SORT_OPTIONS}
      sortValue={sort}
      onSortChange={(value) => {
        if (isPayrollRunSort(value)) onSortChange(value);
      }}
      table={table}
      columnVisibility={columnVisibility}
      columnOrder={columnOrder}
      onColumnOrderChange={onColumnOrderChange}
      initialColumnOrder={PAYROLL_RUN_COLUMN_ORDER}
      primaryColumnId="periodStart"
      additionalControls={
        selectedDraftCount ? (
          <Button size="sm" disabled={isMutating} onClick={onApproveSelected}>
            <ThumbsUp className="size-3.5" />
            Approve {selectedDraftCount} selected
          </Button>
        ) : null
      }
    />
  );
}
