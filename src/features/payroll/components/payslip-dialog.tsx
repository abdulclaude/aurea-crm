"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Download, Printer, X } from "lucide-react";
import * as React from "react";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PayslipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payrollRunId: string;
  workerId: string;
  workerName: string;
}

export function PayslipDialog({
  open,
  onOpenChange,
  payrollRunId,
  workerId,
  workerName,
}: PayslipDialogProps) {
  const trpc = useTRPC();

  const { data: payslip } = useSuspenseQuery(
    trpc.payroll.generatePayslip.queryOptions({
      payrollRunId,
      workerId,
    })
  );

  const handleDownloadPDF = () => {
    if (!payslip?.html) return;

    // Create a new window for printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(payslip.html);
    printWindow.document.close();

    // Wait for content to load, then trigger print dialog
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handlePrint = () => {
    if (!payslip?.html) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(payslip.html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle>Payslip - {workerName}</DialogTitle>
              <DialogDescription>
                View and download payslip
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
              >
                <Printer className="size-4 mr-2" />
                Print
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleDownloadPDF}
              >
                <Download className="size-4 mr-2" />
                Save as PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto border rounded-lg bg-white">
          {payslip?.html && (
            <iframe
              srcDoc={payslip.html}
              className="w-full h-full min-h-[600px]"
              title="Payslip Preview"
              sandbox="allow-same-origin"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
