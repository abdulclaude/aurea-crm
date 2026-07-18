"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";

export function FormSubmissionExportButton({ formId }: { formId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);

  async function exportResponses() {
    setIsExporting(true);
    try {
      const result = await queryClient.fetchQuery(
        trpc.forms.exportSubmissions.queryOptions({ formId }),
      );
      downloadCsv(result.fileName, result.csv);
      toast.success(`Exported ${result.rowCount} form responses`, {
        description: result.possiblePartial
          ? "The export is limited to the 1,000 most recent responses."
          : undefined,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The export could not be created.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isExporting}
      onClick={exportResponses}
    >
      {isExporting ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="size-4" aria-hidden="true" />
      )}
      Export CSV
    </Button>
  );
}

function downloadCsv(fileName: string, csv: string): void {
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
