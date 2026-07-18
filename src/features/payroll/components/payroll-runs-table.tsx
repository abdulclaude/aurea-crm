"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type {
  ColumnOrderState,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import * as React from "react";

import { DataTable } from "@/components/data-table/data-table";
import { usePayrollRunActions } from "@/features/payroll/hooks/use-payroll-run-actions";
import { formatPayrollCurrency } from "@/features/payroll/lib/payroll-formatters";
import { useTRPC } from "@/trpc/client";

import {
  PAYROLL_RUN_COLUMN_ORDER,
  getPayrollRunColumns,
} from "./payroll-run-columns";
import { PayrollRunDetails } from "./payroll-run-details";
import {
  isPayrollRunSort,
  type PayrollRunSort,
  type PayrollStatus,
  PayrollRunsToolbar,
} from "./payroll-runs-toolbar";
import { PayrollTableTotals } from "./payroll-table-totals";

export function PayrollRunsTable({
  canManage,
}: {
  canManage: boolean;
}): React.JSX.Element {
  const trpc = useTRPC();
  const [search, setSearch] = React.useState("");
  const [statuses, setStatuses] = React.useState<PayrollStatus[]>([]);
  const [sort, setSort] = React.useState<PayrollRunSort>("periodStart.desc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>(
    PAYROLL_RUN_COLUMN_ORDER,
  );
  const { data, isFetching } = useSuspenseQuery(
    trpc.payroll.list.queryOptions({
      page,
      pageSize,
      search: search || undefined,
      statuses: statuses.length ? statuses : undefined,
      sort,
    }),
  );

  const { handlers, isMutating } = usePayrollRunActions(setSelectedRunId);
  const columns = React.useMemo(
    () => getPayrollRunColumns({ canManage, handlers, isLoading: isMutating }),
    [canManage, handlers, isMutating],
  );
  const sorting = React.useMemo<SortingState>(() => {
    const [id, direction] = sort.split(".");
    return [{ id, desc: direction === "desc" }];
  }, [sort]);
  const selectedDraftRuns = data.payrollRuns.filter(
    (run) => rowSelection[run.id] && run.status === "DRAFT",
  );
  const currency = data.payrollRuns[0]?.currency ?? "GBP";

  if (selectedRunId) {
    return (
      <PayrollRunDetails
        payrollRunId={selectedRunId}
        onBack={() => setSelectedRunId(null)}
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={data.payrollRuns}
      isLoading={isFetching}
      getRowId={(row) => row.id}
      enableGlobalSearch={false}
      enableRowSelection={canManage}
      rowSelection={rowSelection}
      onRowSelectionChange={setRowSelection}
      sorting={sorting}
      onSortingChange={(next) => {
        const primary = next[0];
        const nextSort = primary
          ? `${primary.id}.${primary.desc ? "desc" : "asc"}`
          : "";
        if (isPayrollRunSort(nextSort)) setSort(nextSort);
      }}
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={setColumnVisibility}
      columnOrder={columnOrder}
      onColumnOrderChange={setColumnOrder}
      initialColumnOrder={PAYROLL_RUN_COLUMN_ORDER}
      toolbar={{
        filters: ({ table }) => (
          <PayrollRunsToolbar
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            statuses={statuses}
            onStatusesChange={(values) => {
              setStatuses(values);
              setPage(1);
            }}
            sort={sort}
            onSortChange={(value) => {
              setSort(value);
              setPage(1);
            }}
            table={table}
            columnVisibility={columnVisibility}
            columnOrder={columnOrder}
            onColumnOrderChange={setColumnOrder}
            selectedDraftCount={selectedDraftRuns.length}
            isMutating={isMutating}
            onApproveSelected={() =>
              selectedDraftRuns.forEach((run) => handlers.onApprove(run.id))
            }
          />
        ),
      }}
      pagination={{
        currentPage: data.pagination.currentPage,
        totalPages: data.pagination.totalPages,
        pageSize: data.pagination.pageSize,
        totalItems: data.pagination.totalItems,
        onPageChange: setPage,
        onPageSizeChange: (size) => {
          setPageSize(size);
          setPage(1);
        },
      }}
      emptyState={
        <div className="py-12 text-center text-xs text-primary/50">
          No payroll runs found.
        </div>
      }
      footer={
        <PayrollTableTotals
          items={[
            {
              label: "Payroll runs",
              value: new Intl.NumberFormat("en-GB").format(
                data.summary.totalItems,
              ),
            },
            {
              label: "Gross pay",
              value: formatPayrollCurrency(
                data.summary.totalGrossPay,
                currency,
              ),
            },
            {
              label: "Deductions",
              value: formatPayrollCurrency(
                data.summary.totalDeductions,
                currency,
              ),
            },
            {
              label: "Net pay",
              value: formatPayrollCurrency(data.summary.totalNetPay, currency),
            },
          ]}
        />
      }
    />
  );
}
