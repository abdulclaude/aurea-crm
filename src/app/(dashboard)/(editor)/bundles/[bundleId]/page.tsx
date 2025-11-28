import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import {
  Editor,
  EditorError,
  EditorLoading,
} from "@/features/editor/components/editor";

import { prefetchBundle } from "@/features/bundles/server/prefetch";
import BundleEditorHeader from "@/features/bundles/components/bundle-editor-header";

interface PageProps {
  params: Promise<{
    bundleId: string;
  }>;
}

const Page = async ({ params }: PageProps) => {
  const { bundleId } = await params;
  prefetchBundle(bundleId);

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<EditorError />}>
        <Suspense fallback={<EditorLoading />}>
          <BundleEditorHeader bundleId={bundleId} />
          <main className="flex-1">
            <Editor workflowId={bundleId} />
          </main>
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default Page;
