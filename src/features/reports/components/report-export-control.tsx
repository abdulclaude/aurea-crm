"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ReportViewDefinition } from "@/features/reports/contracts";
import type { ReportGroupId } from "@/features/reports/types";
import { useTRPC } from "@/trpc/client";

type ReportExportControlProps = {
  canExport: boolean;
  definition: ReportViewDefinition;
  groupId: ReportGroupId;
  reportId: string;
  savedViewId: string | null;
};

export function ReportExportControl(props: ReportExportControlProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const identity = { groupId: props.groupId, reportId: props.reportId };
  const history = useQuery({
    ...trpc.reportFoundation.listExports.queryOptions(identity),
    enabled: props.canExport,
  });
  const exportReport = useMutation(
    trpc.reportFoundation.createExport.mutationOptions({
      onSuccess: async (result) => {
        downloadCsv(result.csv, result.filename);
        await queryClient.invalidateQueries({
          queryKey: trpc.reportFoundation.listExports.queryKey(identity),
        });
        toast.success(
          result.possiblePartial
            ? `Exported ${result.rowCount} loaded rows. The source preview reached its 500-row limit, so this export may be incomplete.`
            : `Exported ${result.rowCount} rows`,
        );
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (!props.canExport) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled
            aria-label="Export unavailable"
          >
            <Download className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>You do not have export access</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Export report">
              {exportReport.isPending ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Export report</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-72 rounded-lg">
        <DropdownMenuItem
          disabled={exportReport.isPending}
          onSelect={() =>
            exportReport.mutate({
              ...identity,
              savedViewId: props.savedViewId,
              definition: props.definition,
            })
          }
        >
          <Download className="size-3.5" /> Export current view as CSV
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[11px] text-primary/60">
          Recent requests
        </DropdownMenuLabel>
        {history.data?.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 px-2 py-2 text-[11px]"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate">{item.filename ?? "Report export"}</p>
              <p className="text-primary/45">
                {formatDistanceToNow(item.requestedAt, { addSuffix: true })}
                {item.rowCount === null ? "" : ` / ${item.rowCount} rows`}
              </p>
            </div>
            <Badge variant="outline">{item.status.toLowerCase()}</Badge>
          </div>
        ))}
        {history.data?.length === 0 ? (
          <p className="px-2 py-4 text-center text-[11px] text-primary/45">
            No exports yet
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function downloadCsv(csv: string, filename: string): void {
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
