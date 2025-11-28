import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { HydrateClient } from "@/trpc/server";
import { requireAuth } from "@/lib/auth-utils";
import type { SearchParams } from "nuqs";
import { AppsContainer, AppsList } from "@/features/apps/components/apps";

type Props = {
  searchParams: Promise<SearchParams>;
};

const Page = async ({ searchParams }: Props) => {
  await requireAuth();
  await searchParams;

  return (
    <AppsContainer>
      <HydrateClient>
        <ErrorBoundary fallback={<>Failed to load apps.</>}>
          <Suspense fallback={<>Loading apps...</>}>
            <AppsList />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </AppsContainer>
  );
};

export default Page;
