"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import * as React from "react";

import { TABLE_BADGE_COLORS, TableBadge } from "@/components/ui/table-badge";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { WaiverDataTable } from "./waiver-data-table";

type WaiverTemplateRow =
  inferRouterOutputs<AppRouter>["waivers"]["listTemplates"][number];

const TEMPLATE_COLUMN_ORDER = [
  "name",
  "content",
  "document",
  "requirement",
  "requiresMinor",
  "version",
  "signatures",
  "status",
  "updatedAt",
];

const templateColumns: ColumnDef<WaiverTemplateRow>[] = [
  {
    accessorKey: "name",
    header: "Waiver",
    meta: { label: "Waiver" },
    enableHiding: false,
    cell: ({ row }) => (
      <span className="text-xs font-medium text-primary">
        {row.original.name}
      </span>
    ),
  },
  {
    accessorKey: "content",
    header: "Content preview",
    meta: { label: "Content preview" },
    cell: ({ row }) => (
      <span className="block max-w-80 truncate text-xs text-primary/60">
        {row.original.content}
      </span>
    ),
  },
  {
    id: "document",
    accessorFn: (row) => row.documentName ?? "",
    header: "Document",
    meta: { label: "Document" },
    cell: ({ row }) =>
      row.original.documentUrl ? (
        <TableBadge asChild color={TABLE_BADGE_COLORS.blue}>
          <a
            href={row.original.documentUrl}
            target="_blank"
            rel="noreferrer"
            title={row.original.documentName ?? "Open waiver PDF"}
          >
            <FileText className="size-3" />
            <span className="truncate">
              {row.original.documentName ?? "Waiver PDF"}
            </span>
          </a>
        </TableBadge>
      ) : (
        <span className="text-xs text-primary/40">No document</span>
      ),
  },
  {
    id: "requirement",
    accessorFn: (row) => (row.isRequired ? "REQUIRED" : "OPTIONAL"),
    header: "Requirement",
    meta: { label: "Requirement" },
    cell: ({ row }) => (
      <TableBadge
        color={
          row.original.isRequired
            ? TABLE_BADGE_COLORS.amber
            : TABLE_BADGE_COLORS.slate
        }
      >
        {row.original.isRequired ? "Required" : "Optional"}
      </TableBadge>
    ),
  },
  {
    accessorKey: "requiresMinor",
    header: "Minor consent",
    meta: { label: "Minor consent" },
    cell: ({ row }) =>
      row.original.requiresMinor ? "Required" : "Not required",
  },
  {
    accessorKey: "version",
    header: "Version",
    meta: { label: "Version" },
    cell: ({ row }) => `v${row.original.version}`,
  },
  {
    id: "signatures",
    accessorFn: (row) => row._count.signatures,
    header: "Signatures",
    meta: { label: "Signatures" },
  },
  {
    id: "status",
    accessorFn: (row) => (row.isActive ? "ACTIVE" : "INACTIVE"),
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <TableBadge
        color={
          row.original.isActive
            ? TABLE_BADGE_COLORS.teal
            : TABLE_BADGE_COLORS.slate
        }
      >
        {row.original.isActive ? "Active" : "Inactive"}
      </TableBadge>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: "Last updated",
    meta: { label: "Last updated" },
    cell: ({ row }) => format(new Date(row.original.updatedAt), "d MMM yyyy"),
  },
];

export function WaiverTemplatesTable() {
  const trpc = useTRPC();
  const templatesQuery = useQuery(trpc.waivers.listTemplates.queryOptions());
  const [statuses, setStatuses] = React.useState<string[]>([]);
  const [requirements, setRequirements] = React.useState<string[]>([]);
  const templates = (templatesQuery.data ?? []).filter(
    (template) =>
      (!statuses.length ||
        statuses.includes(template.isActive ? "ACTIVE" : "INACTIVE")) &&
      (!requirements.length ||
        requirements.includes(template.isRequired ? "REQUIRED" : "OPTIONAL")),
  );

  return (
    <WaiverDataTable
      columns={templateColumns}
      data={templates}
      getRowId={(template) => template.id}
      initialColumnOrder={TEMPLATE_COLUMN_ORDER}
      primaryColumnId="name"
      searchPlaceholder="Search waiver templates..."
      emptyLabel={templatesQuery.error?.message ?? "No waiver templates found."}
      isLoading={templatesQuery.isLoading}
      filterGroups={[
        {
          label: "Status",
          options: [
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
          ],
          selectedValues: statuses,
          onChange: setStatuses,
        },
        {
          label: "Requirement",
          options: [
            { value: "REQUIRED", label: "Required" },
            { value: "OPTIONAL", label: "Optional" },
          ],
          selectedValues: requirements,
          onChange: setRequirements,
        },
      ]}
    />
  );
}
