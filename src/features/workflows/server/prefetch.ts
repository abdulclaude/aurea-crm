import type { inferInput } from "@trpc/tanstack-react-query";
import { prefetch, trpc } from "@/trpc/server";

type BaseInput = inferInput<typeof trpc.workflows.getMany>;
type WithView = BaseInput & { view?: string };

// prefetch workflows page data depending on the selected view
export const prefetchWorkflows = (params: WithView) => {
  const { page, pageSize, search, view } = params;
  if (view === "archived") {
    return prefetch(
      trpc.workflows.getArchived.queryOptions({ page, pageSize, search })
    );
  }
  if (view === "templates") {
    return prefetch(
      trpc.workflows.getTemplates.queryOptions({ page, pageSize, search })
    );
  }
  return prefetch(
    trpc.workflows.getMany.queryOptions({ page, pageSize, search })
  );
};

// prefetch a single workflow

export const prefetchWorkflow = (id: string) => {
  return prefetch(trpc.workflows.getOne.queryOptions({ id }));
};
