"use client";

import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  ErrorView,
  LoadingView,
} from "@/components/react-flow/entity-components";
import { PageTabs } from "@/components/ui/page-tabs";
import { useQueryState } from "nuqs";
import { useSuspenseAllExecutions } from "../hooks/use-executions";
import { ExecutionsTimeline } from "./executions-timeline";
import type { Execution } from "@/db/types";
import { AutomationInsights } from "./automation-insights";
type ExecutionWithWorkflow = Execution & {
  workflow: { id: string; name: string };
};

const ExecutionsList = () => {
  const executions = useSuspenseAllExecutions();

  if (executions.data.length === 0) {
    return <ExecutionsEmpty />;
  }

  return (
    <ExecutionsTimeline
      className=""
      items={executions.data as unknown as ExecutionWithWorkflow[]}
    />
  );
};

export default ExecutionsList;

export const ExecutionsHeader = () => {
  return (
    <EntityHeader
      title="Executions"
      description="View your workflow execution history"
    />
  );
};

export const ExecutionsContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [view, setView] = useQueryState("view", {
    defaultValue: "timeline",
    clearOnDefault: true,
  });

  return (
    <EntityContainer header={<ExecutionsHeader />}>
      <PageTabs
        tabs={[
          { id: "timeline", label: "Timeline" },
          { id: "automation-insights", label: "Automation insights" },
        ]}
        activeTab={view}
        onTabChange={setView}
        className="px-6"
      />
      {view === "automation-insights" ? <AutomationInsights /> : children}
    </EntityContainer>
  );
};

export const ExecutionsLoading = () => {
  return <LoadingView message="Loading executions..." />;
};

export const ExecutionsError = () => {
  return <ErrorView message="Error loading executions..." />;
};

export const ExecutionsEmpty = () => {
  return (
    <EmptyView
      title="No executions"
      label="execution"
      message="No executions have been found. Get started by running your first workflow."
    />
  );
};

// Legacy list item removed in favor of timeline view.
