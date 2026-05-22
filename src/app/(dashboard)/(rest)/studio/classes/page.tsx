"use client";

import { Suspense } from "react";
import { ClassesTable } from "@/features/modules/pilates-studio/components/classes-table";
import { Separator } from "@/components/ui/separator";
import { IconLoader as LoaderIcon } from "central-icons/IconLoader";

export default function StudioClassesPage() {
  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-2 p-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Studio classes</h1>
          <p className="text-xs text-primary/75">
            View and manage your studio class schedule
          </p>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <LoaderIcon className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <ClassesTable />
      </Suspense>
    </div>
  );
}
