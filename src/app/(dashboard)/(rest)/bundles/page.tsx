"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";

import { ErrorBoundary } from "react-error-boundary";

import BundlesList, {
  BundlesContainer,
  BundlesError,
  BundlesLoading,
  BundlesHeader,
  BundlesSearch,
} from "@/features/bundles/components/bundles";

import { PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";

export default function Page() {
  const router = useRouter();

  const handleTabChange = (tabId: string) => {
    if (tabId === "bundles") return;
    if (tabId === "all") {
      router.push("/workflows");
      return;
    }
    if (tabId === "archived") {
      router.push("/archives");
      return;
    }
    router.push(`/workflows?view=${tabId}`);
  };

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-4 p-6 pb-6">
        <div className="flex-1">
          <BundlesHeader />
        </div>
        <BundlesSearch className="w-96" />
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <PageTabs
        tabs={[
          { id: "all", label: "All workflows" },
          { id: "bundles", label: "Bundles" },
          { id: "archived", label: "Archived" },
          { id: "templates", label: "Templates" },
          { id: "activity", label: "Activity" },
        ]}
        activeTab="bundles"
        onTabChange={handleTabChange}
        className="px-6"
      />

      <BundlesContainer>
        <ErrorBoundary fallback={<BundlesError />}>
          <Suspense fallback={<BundlesLoading />}>
            <BundlesList />
          </Suspense>
        </ErrorBoundary>
      </BundlesContainer>
    </div>
  );
}
