"use client";

import { Suspense, useState } from "react";
import { InvoicesTable } from "@/features/invoicing/components/invoices-table";
import { InvoiceDialog } from "@/features/invoicing/components/invoice-dialog";
import { Button } from "@/components/ui/button";
import { PageTabs } from "@/components/ui/page-tabs";

import { IconReceiptBill as Receipt } from "central-icons/IconReceiptBill";

type InvoiceType = "SENT" | "RECEIVED";

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState<InvoiceType>("SENT");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editInvoiceId, setEditInvoiceId] = useState<string | undefined>(
    undefined
  );

  const handleOpenDialog = (invoiceId?: string) => {
    setEditInvoiceId(invoiceId);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditInvoiceId(undefined);
  };

  const tabs = [
    { id: "SENT", label: "Sent Invoices" },
    { id: "RECEIVED", label: "Received Invoices" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-6">
          <div>
            <h1 className="text-lg font-medium text-primary">Invoices</h1>
            <p className="text-xs text-primary/75 mt-1">
              {activeTab === "SENT"
                ? "Manage invoices you send to clients"
                : "Track invoices from contractors and vendors"}
            </p>
          </div>

          <Button onClick={() => handleOpenDialog()} variant="outline">
            <Receipt className="size-3.5" />
            {activeTab === "SENT" ? "New invoice" : "Record invoice"}
          </Button>
        </div>

        {/* Page Tabs */}
        <PageTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as InvoiceType)}
          className="px-8"
        />

        {/* Invoices Table */}
        <Suspense
          key={activeTab}
          fallback={
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">
                Loading invoices...
              </p>
            </div>
          }
        >
          <InvoicesTable
            onEdit={handleOpenDialog}
            invoiceType={activeTab}
          />
        </Suspense>
      </div>

      {/* Invoice Dialog */}
      <InvoiceDialog
        open={isDialogOpen}
        onOpenChange={handleCloseDialog}
        invoiceId={editInvoiceId}
        defaultType={activeTab}
      />
    </div>
  );
}
