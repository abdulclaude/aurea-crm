import type { SearchParams } from "nuqs";

import { WorkflowsPageContent } from "@/features/workflows/components/workflows-page-content";
import { workflowsParamsLoader } from "@/features/workflows/server/params-loader";
import { prefetchWorkflows } from "@/features/workflows/server/prefetch";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function Page({ searchParams }: Props) {
  await requireAuth();
  const params = await workflowsParamsLoader(searchParams);
  await prefetchWorkflows(params);

  return (
    <HydrateClient>
      <WorkflowsPageContent />
    </HydrateClient>
  );
}
