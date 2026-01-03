"use client";

import { Suspense } from "react";
import { LoaderCircle } from "lucide-react";
import { ResendTemplatesTable } from "@/features/email-templates/components/resend-templates-table";
import { Separator } from "@/components/ui/separator";

export default function EmailTemplatesPage() {
  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-2 p-6 pb-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Email Templates</h1>
          <p className="text-xs text-primary/75">
            Browse templates from Resend to use in campaigns
          </p>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <div className="p-6">
        <Suspense
          fallback={
            <div className="border border-white/5 bg-primary-foreground p-6 text-sm text-primary flex items-center justify-center gap-3 rounded-lg">
              <LoaderCircle className="size-4 animate-spin" />
              Loading templates...
            </div>
          }
        >
          <ResendTemplatesTable />
        </Suspense>
      </div>
    </div>
  );
}
