"use client";

import { createContext, useContext, type ReactNode } from "react";

interface WorkflowContextValue {
  isBundle: boolean;
  bundleInputs?: Array<{
    name: string;
    type: string;
    description?: string;
    defaultValue?: unknown;
  }>;
  workflowName: string;
  parentWorkflowContext?: Record<string, Record<string, any>>;
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

export function WorkflowContextProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: WorkflowContextValue;
}) {
  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflowContext() {
  const context = useContext(WorkflowContext);
  if (!context) {
    // Return default values for non-bundle workflows
    return {
      isBundle: false,
      bundleInputs: undefined,
      workflowName: "",
      parentWorkflowContext: undefined,
    };
  }
  return context;
}
