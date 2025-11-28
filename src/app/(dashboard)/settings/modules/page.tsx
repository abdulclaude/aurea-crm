import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { HydrateClient } from "@/trpc/server";
import { requireAuth } from "@/lib/auth-utils";
import type { SearchParams } from "nuqs";
import {
  ModulesContainer,
  ModulesList,
} from "@/features/modules/components/modules";

type Props = {
  searchParams: Promise<SearchParams>;
};

const Page = async ({ searchParams }: Props) => {
  await requireAuth();
  await searchParams;

  return (
    <ModulesContainer>
      <HydrateClient>
        <ErrorBoundary fallback={<>Failed to load modules.</>}>
          <Suspense fallback={<>Loading modules...</>}>
            <ModulesList />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </ModulesContainer>
  );
};

export default Page;
