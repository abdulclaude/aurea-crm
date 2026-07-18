"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Database, History, ReceiptText } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTRPC } from "@/trpc/client";

import { LedgerEntriesPanel } from "./ledger-entries-panel";
import { ReconciliationIssuesPanel } from "./reconciliation-issues-panel";
import { ReconciliationRunsPanel } from "./reconciliation-runs-panel";
import { StripeEventsPanel } from "./stripe-events-panel";

export function CommerceOperationsPage() {
  const trpc = useTRPC();
  const capabilities = useQuery(trpc.permissions.getCurrent.queryOptions());
  const canReconcile = Boolean(
    capabilities.data?.capabilities.includes("commerce.reconcile"),
  );
  const canRefund = Boolean(
    capabilities.data?.capabilities.includes("commerce.refund"),
  );

  return (
    <div className="min-w-0">
      <header className="p-8">
        <h1 className="text-xl font-semibold">Payment operations</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Ledger, retained Stripe receipts, and reconciliation.
        </p>
      </header>
      <Separator />
      <Tabs defaultValue="ledger" className="gap-0">
        <div className="p-4 sm:px-8">
          <TabsList className="max-w-full overflow-x-auto">
            <TabsTrigger value="ledger"><Database />Ledger</TabsTrigger>
            <TabsTrigger value="receipts"><ReceiptText />Stripe receipts</TabsTrigger>
            <TabsTrigger value="issues"><AlertTriangle />Issues</TabsTrigger>
            <TabsTrigger value="runs"><History />Runs</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="ledger"><LedgerEntriesPanel canRefund={canRefund} /></TabsContent>
        <TabsContent value="receipts"><StripeEventsPanel /></TabsContent>
        <TabsContent value="issues"><ReconciliationIssuesPanel canReconcile={canReconcile} /></TabsContent>
        <TabsContent value="runs"><ReconciliationRunsPanel canReconcile={canReconcile} /></TabsContent>
      </Tabs>
    </div>
  );
}
