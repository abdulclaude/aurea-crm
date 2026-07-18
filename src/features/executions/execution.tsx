"use client";

import { useSuspenseExecution } from "./hooks/use-executions";
import { ExecutionDetailHeader } from "./components/execution-detail-header";
import { ExecutionOutputPanel } from "./components/execution-output-panel";
import { ExecutionTechnicalDetails } from "./components/execution-technical-details";

export const ExecutionView = ({ executionId }: { executionId: string }) => {
  const { data: execution } = useSuspenseExecution(executionId);

  return (
    <div className="w-full">
      <ExecutionDetailHeader execution={execution} />
      <div className="grid gap-6 p-4 md:p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <ExecutionOutputPanel execution={execution} />
        <ExecutionTechnicalDetails execution={execution} />
      </div>
    </div>
  );
};
