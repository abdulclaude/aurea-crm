"use client";

import type {
  ColumnOrderState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import * as React from "react";

import { DataTable } from "@/components/data-table/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PayrollPeriod } from "@/features/payroll/hooks/use-payroll-reporting-controller";
import {
  formatPayrollCurrency,
  formatPayrollHours,
} from "@/features/payroll/lib/payroll-formatters";
import { StudioTableToolbar } from "@/features/studio/components/studio-table-toolbar";

import {
  PAYROLL_INSTRUCTOR_COLUMN_ORDER,
  payrollInstructorColumns,
  type PayrollInstructorRow,
} from "./payroll-instructor-columns";
import { PayrollTableTotals } from "./payroll-table-totals";

type PayrollSummary = {
  totalGrossPay: number;
  totalInstructors: number;
  totalNetPay: number;
  totalOvertimeHours: number;
  totalRegularHours: number;
};

const SORT_OPTIONS = [
  { value: "instructor.asc", label: "Name A-Z" },
  { value: "instructor.desc", label: "Name Z-A" },
  { value: "totalHours.desc", label: "Most hours" },
  { value: "grossPay.desc", label: "Highest gross pay" },
];

export function PayrollInstructorsTable({
  instructors,
  summary,
  selectedPeriod,
  onPeriodChange,
}: {
  instructors: PayrollInstructorRow[];
  summary: PayrollSummary;
  selectedPeriod: PayrollPeriod;
  onPeriodChange: (period: PayrollPeriod) => void;
}): React.JSX.Element {
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("instructor.asc");
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>(
    PAYROLL_INSTRUCTOR_COLUMN_ORDER,
  );
  const filteredRows = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return instructors;
    return instructors.filter((row) =>
      `${row.instructorName} ${row.instructorEmail ?? ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [instructors, search]);
  const sorting = React.useMemo<SortingState>(() => {
    const [id, direction] = sort.split(".");
    return [{ id, desc: direction === "desc" }];
  }, [sort]);
  const monthOptions = React.useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const month = subMonths(new Date(), index);
        return {
          label: format(month, "MMMM yyyy"),
          value: startOfMonth(month).toISOString(),
        };
      }),
    [],
  );
  const currency = instructors[0]?.currency ?? "GBP";

  return (
    <DataTable
      columns={payrollInstructorColumns}
      data={filteredRows}
      enableGlobalSearch={false}
      sorting={sorting}
      onSortingChange={(next) => {
        const primary = next[0];
        if (primary) setSort(`${primary.id}.${primary.desc ? "desc" : "asc"}`);
      }}
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={setColumnVisibility}
      columnOrder={columnOrder}
      onColumnOrderChange={setColumnOrder}
      initialColumnOrder={PAYROLL_INSTRUCTOR_COLUMN_ORDER}
      toolbar={{
        filters: ({ table }) => (
          <StudioTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search period overview..."
            sortOptions={SORT_OPTIONS}
            sortValue={sort}
            onSortChange={setSort}
            table={table}
            columnVisibility={columnVisibility}
            columnOrder={columnOrder}
            onColumnOrderChange={setColumnOrder}
            initialColumnOrder={PAYROLL_INSTRUCTOR_COLUMN_ORDER}
            primaryColumnId="instructor"
            additionalControls={
              <Select
                value={selectedPeriod.start.toISOString()}
                onValueChange={(value) => {
                  const month = new Date(value);
                  onPeriodChange({
                    start: startOfMonth(month),
                    end: endOfMonth(month),
                  });
                }}
              >
                <SelectTrigger
                  className="h-8.5 w-44 rounded-lg text-xs"
                  aria-label="Payroll period"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
        ),
      }}
      emptyState={
        <div className="py-12 text-center text-xs text-primary/50">
          No approved time logs in this period.
        </div>
      }
      footer={
        <PayrollTableTotals
          items={[
            {
              label: "Team members",
              value: new Intl.NumberFormat("en-GB").format(
                summary.totalInstructors,
              ),
            },
            {
              label: "Regular hours",
              value: formatPayrollHours(summary.totalRegularHours),
            },
            {
              label: "Overtime",
              value: formatPayrollHours(summary.totalOvertimeHours),
            },
            {
              label: "Total hours",
              value: formatPayrollHours(
                summary.totalRegularHours + summary.totalOvertimeHours,
              ),
            },
            {
              label: "Gross pay",
              value: formatPayrollCurrency(summary.totalGrossPay, currency),
            },
            {
              label: "Estimated net",
              value: formatPayrollCurrency(summary.totalNetPay, currency),
            },
          ]}
        />
      }
    />
  );
}
