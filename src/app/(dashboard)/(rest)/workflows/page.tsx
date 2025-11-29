"use client";

import { Suspense } from "react";

import { ErrorBoundary } from "react-error-boundary";

import WorkflowsList, {
  WorkflowsContainer,
  WorkflowsError,
  WorkflowsLoading,
  WorkflowsHeader,
  WorkflowsSearch,
} from "@/features/workflows/components/workflows";

import { PageTabs } from "@/components/ui/page-tabs";
import { ActivityTimeline } from "@/features/activity/components/activity-timeline";
import { Separator } from "@/components/ui/separator";
import { useWorkflowsParams } from "@/features/workflows/hooks/use-workflows-params";

export default function Page() {
  const [params, setParams] = useWorkflowsParams();
  const view = params.view || "all";

  const handleTabChange = (tabId: string) => {
    setParams({ ...params, view: tabId, page: 1 });
  };

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-4 p-6 pb-6">
        <div className="flex-1">
          <WorkflowsHeader />
        </div>

        <WorkflowsSearch className="w-72" />
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <PageTabs
        tabs={[
          { id: "all", label: "All workflows" },
          { id: "archived", label: "Archived" },
          { id: "templates", label: "Templates" },
          { id: "activity", label: "Activity" },
        ]}
        activeTab={view}
        onTabChange={handleTabChange}
        className="px-6"
      />

      {view === "activity" ? (
        <div className="p-6">
          <ActivityTimeline limit={50} filterByEntityType="WORKFLOW" />
        </div>
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
