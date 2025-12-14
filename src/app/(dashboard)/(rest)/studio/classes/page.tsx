"use client";

import { Suspense } from "react";
import { ClassesTable } from "@/features/modules/pilates-studio/components/classes-table";
import { Loader2 } from "lucide-react";

export default function StudioClassesPage() {
  return (
    <div className="container max-w-7xl py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Studio Classes</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your studio class schedule
        </p>
      </div>

      {/* Data Table */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        }
      >
        <ClassesTable />
      </Suspense>
    </div>
  );
}
