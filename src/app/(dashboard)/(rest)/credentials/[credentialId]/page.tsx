import {
  CredentialsError,
  CredentialsLoading,
} from "@/features/credentials/components/credentials";
import { CredentialView } from "@/features/credentials/components/credentials-form";
import { prefetchCredential } from "@/features/credentials/server/prefetch";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface PageProps {
  params: Promise<{
    credentialId: string;
  }>;
}

const Page = async ({ params }: PageProps) => {
  const { credentialId } = await params;

  prefetchCredential(credentialId);

  return (
    <div className="p-4 md:px-10 md:py-6 h-svh">
      <div className="mx-auto max-w-3xl w-full flex flex-col justify-center gap-y-8 h-full">
        <HydrateClient>
          <ErrorBoundary fallback={<CredentialsError />}>
            <Suspense fallback={<CredentialsLoading />}>
              <CredentialView credentialId={credentialId} />
            </Suspense>
          </ErrorBoundary>
        </HydrateClient>
      </div>
    </div>
  );
};

export default Page;
