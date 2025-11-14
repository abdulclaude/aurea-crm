import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { HydrateClient } from "@/trpc/server";
import { requireAuth } from "@/lib/auth-utils";
import type { SearchParams } from "nuqs";
import {
  IntegrationsContainer,
  IntegrationsList,
} from "@/features/integrations/components/integrations";

type Props = {
  searchParams: Promise<SearchParams>;
};

const Page = async ({ searchParams }: Props) => {
  await requireAuth();
  await searchParams;

  return (
    <IntegrationsContainer>
      <HydrateClient>
        <ErrorBoundary fallback={<>Failed to load integrations.</>}>
          <Suspense fallback={<>Loading integrations...</>}>
            <IntegrationsList />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </IntegrationsContainer>
  );
};

export default Page;
