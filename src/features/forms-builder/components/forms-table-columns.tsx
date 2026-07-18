"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { formatDistanceToNow } from "date-fns";
import {
  Archive,
  Copy,
  Edit,
  Eye,
  FileText,
  MoreHorizontal,
  Trash2,
  Workflow,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppRouter } from "@/trpc/routers/_app";
import type { PublicationTargetSummary } from "@/features/publications/components/publication-ui-types";
import { FormStatusBadge } from "@/features/forms-builder/components/form-status-badge";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type FormListRow = RouterOutput["forms"]["list"][number];

export function buildFormColumns(input: {
  onArchive: (form: FormListRow) => void;
  onDuplicate: (form: FormListRow) => void;
  onDelete: (form: FormListRow) => void;
  publicationsBySourceKey: ReadonlyMap<string, PublicationTargetSummary>;
}): ColumnDef<FormListRow>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: "Form",
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary/40" />
          <span className="text-xs font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <FormStatusBadge status={row.original.status} />,
    },
    {
      id: "steps",
      accessorFn: (row) => row._count.formStep,
      header: "Steps",
      cell: ({ row }) => (
        <span className="text-xs text-primary/60">
          {row.original._count.formStep}
        </span>
      ),
    },
    {
      id: "responses",
      accessorFn: (row) => row._count.formSubmission,
      header: "Responses",
      cell: ({ row }) => (
        <Link
          href={`/builder/forms/${row.original.id}/submissions`}
          className="text-xs text-primary/60 hover:text-primary"
          onClick={(event) => event.stopPropagation()}
        >
          {row.original._count.formSubmission}
        </Link>
      ),
    },
    {
      id: "publication",
      header: "Landing page",
      meta: { label: "Landing page" },
      cell: ({ row }) => {
        const sourceKey = `form:${row.original.id}`;
        const target = input.publicationsBySourceKey.get(sourceKey);
        return target ? (
          <Link
            href={`/settings/publication?sourceKey=${encodeURIComponent(sourceKey)}`}
            className="text-xs text-primary/65 underline-offset-4 hover:text-primary hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {target.status === "PUBLISHED" ? "Published" : "Finish setup"}
          </Link>
        ) : (
          <Link
            href={`/settings/publication?sourceKey=${encodeURIComponent(sourceKey)}`}
            className="text-xs text-primary/40 underline-offset-4 hover:text-primary hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            Not shared
          </Link>
        );
      },
    },
    {
      id: "created",
      accessorFn: (row) => new Date(row.createdAt).getTime(),
      header: "Created",
      cell: ({ row }) => (
        <span className="text-xs text-primary/50">
          {formatDistanceToNow(new Date(row.original.createdAt), {
            addSuffix: true,
          })}
        </span>
      ),
    },
    {
      id: "updated",
      accessorFn: (row) => new Date(row.updatedAt).getTime(),
      header: "Updated",
      cell: ({ row }) => (
        <span className="text-xs text-primary/50">
          {formatDistanceToNow(new Date(row.original.updatedAt), {
            addSuffix: true,
          })}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
            <Button type="button" variant="ghost" size="icon" className="size-8">
              <span className="sr-only">Open form actions</span>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenuItem asChild>
              <Link href={`/builder/forms/${row.original.id}/editor`}>
                <Edit className="size-3.5" /> Edit form
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/builder/forms/${row.original.id}/submissions`}>
                <Eye className="size-3.5" /> View responses
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href={`/workflows?studioEvent=FORM_SUBMITTED&formId=${encodeURIComponent(row.original.id)}&resourceName=${encodeURIComponent(row.original.name)}`}
              >
                <Workflow className="size-3.5" /> Create response automation
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => input.onDuplicate(row.original)}>
              <Copy className="size-3.5" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => input.onArchive(row.original)}>
              <Archive className="size-3.5" /> Archive
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => input.onDelete(row.original)}
            >
              <Trash2 className="size-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
