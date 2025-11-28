import type { inferInput } from "@trpc/tanstack-react-query";
import { prefetch, trpc } from "@/trpc/server";

type BaseInput = inferInput<typeof trpc.workflows.getMany>;

// prefetch bundles page data
export const prefetchBundles = (params: BaseInput) => {
  const { page, pageSize, search } = params;
  return prefetch(
    trpc.workflows.getMany.queryOptions({ page, pageSize, search, isBundle: true })
  );
};

// prefetch a single bundle

export const prefetchBundle = (id: string) => {
  return prefetch(trpc.workflows.getOne.queryOptions({ id }));
};
