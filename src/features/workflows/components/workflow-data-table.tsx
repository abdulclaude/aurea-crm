"use client";

import type { ColumnOrderState, VisibilityState } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import * as React from "react";

import { DataTable } from "@/components/data-table/data-table";
import {
  useSuspenseArchivedWorkflows,
  useSuspenseWorkflows,
  useWorkflowFolders,
} from "../hooks/use-workflows";
import { useWorkflowsParams } from "../hooks/use-workflows-params";
import { useWorkflowTableColumns } from "./workflow-table-columns";
import { WorkflowTableToolbar } from "./workflow-table-toolbar";
import type {
  WorkflowTableMode,
  WorkflowTableRow,
} from "./workflow-table-types";

const COLUMN_ORDER = [
  "name",
  "status",
  "folder",
  "nodes",
  "createdAt",
  "updatedAt",
  "actions",
];

export function WorkflowDataTable({ mode }: { mode: WorkflowTableMode }) {
  return mode === "active" ? (
    <ActiveWorkflowDataTable />
  ) : (
    <ArchivedWorkflowDataTable />
  );
}

function ActiveWorkflowDataTable() {
  const query = useSuspenseWorkflows();
  return <WorkflowDataTableContent mode="active" query={query} />;
}

function ArchivedWorkflowDataTable() {
  const query = useSuspenseArchivedWorkflows();
  return <WorkflowDataTableContent mode="archived" query={query} />;
}

type WorkflowTableQuery = {
  data: {
    items: WorkflowTableRow[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  isFetching: boolean;
};

function WorkflowDataTableContent({
  mode,
  query,
}: {
  mode: WorkflowTableMode;
  query: WorkflowTableQuery;
}) {
  const router = useRouter();
  const [params, setParams] = useWorkflowsParams();
  const foldersQuery = useWorkflowFolders();
  const folders = foldersQuery.data?.folders ?? [];
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(COLUMN_ORDER);

  const columns = useWorkflowTableColumns({ folders, mode });

  return (
    <DataTable<WorkflowTableRow, unknown>
      columns={columns}
      data={query.data.items}
      isLoading={query.isFetching}
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(`/workflows/${row.id}`)}
      enableGlobalSearch={false}
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={setColumnVisibility}
      columnOrder={columnOrder}
      onColumnOrderChange={setColumnOrder}
      initialColumnOrder={COLUMN_ORDER}
      emptyState={
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-medium text-primary">
            {mode === "active"
              ? "No active workflows"
              : "No archived workflows"}
          </p>
          <p className="mt-1 text-xs text-primary/50">
            {mode === "active"
              ? "Create a workflow or adjust the table filters."
              : "Archived workflows will appear here."}
          </p>
        </div>
      }
      toolbar={{
        filters: (context) => (
          <WorkflowTableToolbar
            table={context.table}
            folders={folders}
            columnVisibility={columnVisibility}
            columnOrder={columnOrder}
            onColumnOrderChange={setColumnOrder}
            initialColumnOrder={COLUMN_ORDER}
          />
        ),
      }}
      pagination={{
        currentPage: query.data.page,
        totalPages: query.data.totalPages,
        pageSize: query.data.pageSize,
        totalItems: query.data.totalCount,
        onPageChange: (page) => setParams({ page }),
        onPageSizeChange: (pageSize) => setParams({ pageSize, page: 1 }),
        pageSizeOptions: [5, 10, 20, 50],
      }}
    />
  );
}
