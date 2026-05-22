"use client";

import { LoaderCircle, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { HouseholdsTable } from "@/features/households/components/households-table";

export default function HouseholdsPage() {
  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-4 p-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Households</h1>
          <p className="text-xs text-primary/70">
            Link parent accounts, partners, children, and dependents.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/households/new">
            <Plus className="size-3.5" />
            New household
          </Link>
        </Button>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <Suspense
        fallback={
          <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground text-sm text-primary flex items-center justify-center gap-3 p-6">
            <LoaderCircle className="size-3.5 animate-spin" />
            Loading households...
          </div>
        }
      >
        <HouseholdsTable />
      </Suspense>
    </div>
  );
}
