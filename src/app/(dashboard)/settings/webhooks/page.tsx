import WebhooksList, {
  WebhooksContainer,
  WebhooksError,
  WebhooksLoading,
} from "@/features/webhooks/components/webhooks";
import { webhooksParamsLoader } from "@/features/webhooks/server/params-loader";
import { prefetchWebhooks } from "@/features/webhooks/server/prefetch";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";
import { SearchParams } from "nuqs";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

type Props = {
  searchParams: Promise<SearchParams>;
};

const Page = async ({ searchParams }: Props) => {
  await requireAuth();
  const params = await webhooksParamsLoader(searchParams);
  prefetchWebhooks(params);

  return (
    <WebhooksContainer>
      <HydrateClient>
        <ErrorBoundary fallback={<WebhooksError />}>
          <Suspense fallback={<WebhooksLoading />}>
            <WebhooksList />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </WebhooksContainer>
  );
};

export default Page;

