"use client";

import { Download, FileText, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type ClientsBulkToolbarProps = {
  canDelete: boolean;
  canExport: boolean;
  count: number;
  onClear: () => void;
  onDelete: () => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
};

export function ClientsBulkToolbar({
  canDelete,
  canExport,
  count,
  onClear,
  onDelete,
  onExportCsv,
  onExportPdf,
}: ClientsBulkToolbarProps) {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1 rounded-md border border-black/10 bg-background p-1.5 shadow-xl dark:border-white/10">
      <span className="whitespace-nowrap px-2 text-xs font-medium text-primary">
        {count} selected
      </span>
      {canExport ? (
        <>
          <Button size="sm" variant="ghost" onClick={onExportCsv}>
            <Download className="size-3.5" /> CSV
          </Button>
          <Button size="sm" variant="ghost" onClick={onExportPdf}>
            <FileText className="size-3.5" /> PDF
          </Button>
        </>
      ) : null}
      {canDelete ? (
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" /> Delete
        </Button>
      ) : null}
      <Button
        size="icon"
        variant="ghost"
        className="size-8"
        aria-label="Clear selection"
        onClick={onClear}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
