"use client";

import type {
  ColumnOrderState,
  Table,
  VisibilityState,
} from "@tanstack/react-table";

import { StudioTableToolbar } from "@/features/studio/components/studio-table-toolbar";
import { useWorkflowsParams } from "../hooks/use-workflows-params";
import { WorkflowFolderCreateButton } from "./workflow-folder-create-button";
import type { WorkflowFolder } from "./workflow-folders";
import type { WorkflowTableRow } from "./workflow-table-types";

const SORT_OPTIONS = [
  { value: "updatedAt.desc", label: "Recently updated" },
  { value: "updatedAt.asc", label: "Least recently updated" },
  { value: "createdAt.desc", label: "Newest created" },
  { value: "createdAt.asc", label: "Oldest created" },
  { value: "name.asc", label: "Name A-Z" },
  { value: "name.desc", label: "Name Z-A" },
];

type WorkflowTableToolbarProps = {
  table: Table<WorkflowTableRow>;
  folders: WorkflowFolder[];
  columnVisibility: VisibilityState;
  columnOrder: ColumnOrderState;
  onColumnOrderChange: (order: ColumnOrderState) => void;
  initialColumnOrder: ColumnOrderState;
};

export function WorkflowTableToolbar({
  table,
  folders,
  columnVisibility,
  columnOrder,
  onColumnOrderChange,
  initialColumnOrder,
}: WorkflowTableToolbarProps) {
  const [params, setParams] = useWorkflowsParams();

  return (
    <StudioTableToolbar
      search={params.search}
      onSearchChange={(search) => setParams({ search, page: 1 })}
      searchPlaceholder="Search workflows..."
      filterGroups={[
        {
          label: "Folder",
          options: [
            { value: "unfiled", label: "Unfiled" },
            ...folders.map((folder) => ({
              value: folder.id,
              label: folder.name,
            })),
          ],
          selectedValues: params.folder === "all" ? [] : [params.folder],
          onChange: (values) =>
            setParams({
              folder: values.length === 1 ? values[0] : "all",
              page: 1,
            }),
        },
        {
          label: "Type",
          options: [
            { value: "workflow", label: "Workflow" },
            { value: "bundle", label: "Bundle" },
          ],
          selectedValues: params.kind === "all" ? [] : [params.kind],
          onChange: (values) =>
            setParams({
              kind:
                values.length === 1 &&
                (values[0] === "workflow" || values[0] === "bundle")
                  ? values[0]
                  : "all",
              page: 1,
            }),
        },
      ]}
      sortOptions={SORT_OPTIONS}
      sortValue={params.sort}
      onSortChange={(sort) => {
        if (
          sort === "updatedAt.desc" ||
          sort === "updatedAt.asc" ||
          sort === "createdAt.desc" ||
          sort === "createdAt.asc" ||
          sort === "name.asc" ||
          sort === "name.desc"
        ) {
          setParams({ sort, page: 1 });
        }
      }}
      table={table}
      columnVisibility={columnVisibility}
      columnOrder={columnOrder}
      onColumnOrderChange={onColumnOrderChange}
      initialColumnOrder={initialColumnOrder}
      primaryColumnId="name"
      additionalControls={<WorkflowFolderCreateButton />}
    />
  );
}
