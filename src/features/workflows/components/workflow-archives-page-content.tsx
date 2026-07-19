"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { ErrorBoundary } from "react-error-boundary";

import { EntityHeader } from "@/components/react-flow/entity-components";
import { PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";
import { WorkflowDataTable } from "./workflow-data-table";
import { WorkflowsError, WorkflowsLoading } from "./workflows";

export function WorkflowArchivesPageContent() {
  const router = useRouter();

  const handleTabChange = (tabId: string) => {
    if (tabId === "archived") return;
    if (tabId === "bundles") {
      router.push("/bundles");
      return;
    }
    if (tabId === "all") {
      router.push("/workflows");
      return;
    }
    router.push(`/workflows?view=${tabId}`);
  };

  return (
    <div className="space-y-0">
      <div className="p-4 md:p-6">
        <EntityHeader
          title="Workflow archives"
          description="Review inactive workflows before reactivating or deleting them."
        />
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <PageTabs
        tabs={[
          { id: "all", label: "All workflows" },
          { id: "bundles", label: "Bundles" },
          { id: "archived", label: "Archived" },
          { id: "templates", label: "Templates" },
          { id: "activity", label: "Activity" },
        ]}
        activeTab="archived"
        onTabChange={handleTabChange}
        className="px-4 md:px-6"
      />

      <ErrorBoundary fallback={<WorkflowsError />}>
        <Suspense fallback={<WorkflowsLoading />}>
          <WorkflowDataTable mode="archived" />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
