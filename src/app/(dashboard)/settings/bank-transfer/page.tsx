"use client";

import { Suspense } from "react";
import { Separator } from "@/components/ui/separator";
import { BankTransferSettingsForm } from "@/features/invoicing/components/bank-transfer-settings-form";
import { Loader2 } from "lucide-react";

export default function BankTransferSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="p-8 pb-4">
        <h1 className="text-xl font-medium">Bank transfer settings</h1>
        <p className="text-xs text-primary/75 mt-1">
          Configure bank transfer payment method for invoices
        </p>
      </div>

      <Separator />

      <Suspense fallback={
        <div className="flex items-center justify-center p-8 h-[calc(100svh-10rem)]">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }>
        <BankTransferSettingsForm />
      </Suspense>
    </div>
  );
}
