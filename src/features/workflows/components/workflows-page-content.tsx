"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { ErrorBoundary } from "react-error-boundary";

import { ActivityTimeline } from "@/features/activity/components/activity-timeline";
import { PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";
import { useWorkflowsParams } from "../hooks/use-workflows-params";
import { WorkflowDataTable } from "./workflow-data-table";
import WorkflowsList, {
  WorkflowsContainer,
  WorkflowsError,
  WorkflowsHeader,
  WorkflowsLoading,
} from "./workflows";

export function WorkflowsPageContent() {
  const [params, setParams] = useWorkflowsParams();
  const router = useRouter();
  const view = params.view || "all";

  const handleTabChange = (tabId: string) => {
    if (tabId === "bundles") {
      router.push("/bundles");
      return;
    }
    if (tabId === "archived") {
      router.push("/archives");
      return;
    }
    setParams({ ...params, view: tabId, page: 1 });
  };

  return (
    <div className="space-y-0">
      <div className="p-4 md:p-6">
        <WorkflowsHeader />
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
        activeTab={view}
        onTabChange={handleTabChange}
        className="px-4 md:px-6"
      />

      {view === "activity" ? (
        <div className="p-4 md:p-6">
          <ActivityTimeline limit={50} filterByEntityType="workflow" />
        </div>
      ) : view === "all" ? (
        <ErrorBoundary fallback={<WorkflowsError />}>
          <Suspense fallback={<WorkflowsLoading />}>
            <WorkflowDataTable mode="active" />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <WorkflowsContainer>
          <ErrorBoundary fallback={<WorkflowsError />}>
            <Suspense fallback={<WorkflowsLoading />}>
              <WorkflowsList />
            </Suspense>
          </ErrorBoundary>
        </WorkflowsContainer>
      )}
    </div>
  );
}
