import type { inferInput } from "@trpc/tanstack-react-query";
import { prefetch, trpc } from "@/trpc/server";
import {
  workflowKindValues,
  workflowSortValues,
} from "@/features/workflows/params";

type BaseInput = inferInput<typeof trpc.workflows.getMany>;
type WithView = BaseInput & {
  view?: string;
  folder?: string;
  kind?: (typeof workflowKindValues)[number];
  sort?: (typeof workflowSortValues)[number];
};

// prefetch workflows page data depending on the selected view
export const prefetchWorkflows = (params: WithView) => {
  const { page, pageSize, search, view, folder, kind, sort } = params;
  const listInput = {
    page,
    pageSize,
    search,
    folderId: folder,
    isBundle:
      kind === "bundle" ? true : kind === "workflow" ? false : undefined,
    sort,
  };

  if (view === "archived") {
    return prefetch(trpc.workflows.getArchived.queryOptions(listInput));
  }
  if (view === "templates") {
    return prefetch(
      trpc.workflows.getTemplates.queryOptions({ page, pageSize, search })
    );
  }
  return prefetch(trpc.workflows.getMany.queryOptions(listInput));
};

// prefetch a single workflow

export const prefetchWorkflow = (id: string) => {
  return prefetch(trpc.workflows.getOne.queryOptions({ id }));
};
