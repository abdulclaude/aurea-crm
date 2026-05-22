"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getReportGroupLabel,
  toReportSentenceCase,
} from "@/features/reports/helpers";
import type { ReportCatalogItem } from "@/features/reports/types";

export function getReportCatalogColumns(
  getReportHref?: (report: ReportCatalogItem) => string,
): ColumnDef<ReportCatalogItem>[] {
  const baseColumns: ColumnDef<ReportCatalogItem>[] = [
    {
      accessorKey: "name",
      header: "Report",
      enableHiding: false,
      cell: ({ row }) => (
        <div className="min-w-0 max-w-[36rem] space-y-1 whitespace-normal break-words">
          <div className="text-wrap font-medium leading-5 text-primary">
            {toReportSentenceCase(row.original.name)}
          </div>
          <div className="text-wrap text-xs leading-5 text-primary/60">
            {row.original.description}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "groupId",
      header: "Group",
      cell: ({ row }) => (
        <Badge variant="outline">
          {getReportGroupLabel(row.original.groupId)}
        </Badge>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <span className="whitespace-normal break-words text-primary/75">
          {toReportSentenceCase(row.original.category)}
        </span>
      ),
    },
  ];

  if (!getReportHref) return baseColumns;

  return [
    ...baseColumns,
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) => (
        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
          <Link href={getReportHref(row.original)}>Open</Link>
        </Button>
      ),
    },
  ];
}
