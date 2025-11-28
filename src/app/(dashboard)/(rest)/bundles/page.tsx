import { Suspense } from "react";

import { ErrorBoundary } from "react-error-boundary";

import { HydrateClient } from "@/trpc/server";

import { requireAuth } from "@/lib/auth-utils";

import BundlesList, {
  BundlesContainer,
  BundlesError,
  BundlesLoading,
} from "@/features/bundles/components/bundles";
import { prefetchBundles } from "@/features/bundles/server/prefetch";

import type { SearchParams } from "nuqs/server";
import { bundlesParamsLoader } from "@/features/bundles/server/params-loader";

type Props = {
  searchParams: Promise<SearchParams>;
};

const Page: React.FC<Props> = async ({ searchParams }) => {
  await requireAuth();

  const params = await bundlesParamsLoader(searchParams);
  prefetchBundles(params);

  return (
    <BundlesContainer>
      <HydrateClient>
        <ErrorBoundary fallback={<BundlesError />}>
          <Suspense fallback={<BundlesLoading />}>
            <BundlesList />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </BundlesContainer>
  );
};

export default Page;
