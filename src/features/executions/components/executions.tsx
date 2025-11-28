"use client";

import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  ErrorView,
  LoadingView,
} from "@/components/react-flow/entity-components";
import { useSuspenseAllExecutions } from "../hooks/use-executions";
import { ExecutionsTimeline } from "./executions-timeline";
import type { Execution } from "@prisma/client";
import { Separator } from "@/components/ui/separator";
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
  return (
    <EntityContainer header={<ExecutionsHeader />}>{children}</EntityContainer>
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
