"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { FolderIcon, PackageIcon, WorkflowIcon } from "lucide-react";
import * as React from "react";

import { TABLE_BADGE_COLORS, TableBadge } from "@/components/ui/table-badge";
import type { WorkflowFolder } from "./workflow-folders";
import { WorkflowTableActions } from "./workflow-table-actions";
import type {
  WorkflowTableMode,
  WorkflowTableRow,
} from "./workflow-table-types";

export function useWorkflowTableColumns({
  folders,
  mode,
}: {
  folders: WorkflowFolder[];
  mode: WorkflowTableMode;
}): ColumnDef<WorkflowTableRow>[] {
  return React.useMemo(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        meta: { label: "Name" },
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex min-w-64 items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-black/10 bg-background dark:border-white/10">
              {row.original.isBundle ? (
                <PackageIcon className="size-3.5 text-primary/65" />
              ) : (
                <WorkflowIcon className="size-3.5 text-primary/65" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-primary">
                {row.original.name}
              </p>
              <p className="truncate text-[11px] text-primary/45">
                {row.original.description ||
                  (row.original.isBundle
                    ? "Workflow bundle"
                    : "Automation workflow")}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "status",
        accessorFn: () => (mode === "active" ? "ACTIVE" : "ARCHIVED"),
        header: "Status",
        meta: { label: "Status" },
        cell: () => (
          <TableBadge
            color={
              mode === "active"
                ? TABLE_BADGE_COLORS.teal
                : TABLE_BADGE_COLORS.slate
            }
            className="font-normal"
          >
            {mode === "active" ? "Active" : "Archived"}
          </TableBadge>
        ),
      },
      {
        id: "folder",
        accessorFn: (row) => row.folderName ?? "Unfiled",
        header: "Folder",
        meta: { label: "Folder" },
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-xs text-primary/65">
            <FolderIcon
              className="size-3.5"
              style={
                row.original.folderColor
                  ? { color: row.original.folderColor }
                  : undefined
              }
            />
            {row.original.folderName ?? "Unfiled"}
          </div>
        ),
      },
      {
        id: "nodes",
        accessorFn: (row) => row.nodes.length,
        header: "Nodes",
        meta: { label: "Nodes" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/65">
            {
              row.original.nodes.filter((node) => node.type !== "INITIAL")
                .length
            }
          </span>
        ),
      },
      ...(["createdAt", "updatedAt"] as const).map((key) => ({
        id: key,
        accessorKey: key,
        header: key === "createdAt" ? "Created" : "Updated",
        meta: { label: key === "createdAt" ? "Created" : "Updated" },
        cell: ({ row }: { row: { original: WorkflowTableRow } }) => (
          <span className="whitespace-nowrap text-xs text-primary/55">
            {format(new Date(row.original[key]), "dd MMM yyyy")}
          </span>
        ),
      })),
      {
        id: "actions",
        header: "",
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => (
          <WorkflowTableActions
            row={row.original}
            mode={mode}
            folders={folders}
          />
        ),
      },
    ],
    [folders, mode],
  );
}
