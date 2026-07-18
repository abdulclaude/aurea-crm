import type { SearchParams } from "nuqs";

import { WorkflowArchivesPageContent } from "@/features/workflows/components/workflow-archives-page-content";
import { workflowsParamsLoader } from "@/features/workflows/server/params-loader";
import { prefetchWorkflows } from "@/features/workflows/server/prefetch";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function ArchivesPage({ searchParams }: Props) {
  await requireAuth();
  const params = await workflowsParamsLoader(searchParams);
  await prefetchWorkflows({ ...params, view: "archived" });

  return (
    <HydrateClient>
      <WorkflowArchivesPageContent />
    </HydrateClient>
  );
}
