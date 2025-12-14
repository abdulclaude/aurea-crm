"use client";

import { Suspense, useState } from "react";
import { RecurringInvoicesTable } from "@/features/invoicing/components/recurring-invoices-table";
import { RecurringInvoiceDialog } from "@/features/invoicing/components/recurring-invoice-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function RecurringInvoicesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editInvoiceId, setEditInvoiceId] = useState<string | undefined>(undefined);

  const handleOpenDialog = (invoiceId?: string) => {
    setEditInvoiceId(invoiceId);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditInvoiceId(undefined);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex-1 space-y-6 p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">
              Recurring Invoices
            </h1>
            <p className="text-sm text-primary/60 dark:text-white/60 mt-1">
              Automate invoice generation for retainers and subscriptions
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 size-4" />
            New Recurring Invoice
          </Button>
        </div>

        {/* Recurring Invoices Table */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">
                Loading recurring invoices...
              </p>
            </div>
          }
        >
          <RecurringInvoicesTable onEdit={handleOpenDialog} />
        </Suspense>
      </div>

      {/* Recurring Invoice Dialog */}
      <RecurringInvoiceDialog
        open={isDialogOpen}
        onOpenChange={handleCloseDialog}
        recurringInvoiceId={editInvoiceId}
      />
    </div>
  );
}
