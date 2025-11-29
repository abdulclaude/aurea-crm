"use client";

import { Suspense, useState } from "react";

import { ErrorBoundary } from "react-error-boundary";

import BundlesList, {
  BundlesContainer,
  BundlesError,
  BundlesLoading,
  BundlesHeader,
  BundlesSearch,
} from "@/features/bundles/components/bundles";

import { PageTabs } from "@/components/ui/page-tabs";
import { ActivityTimeline } from "@/features/activity/components/activity-timeline";
import { Separator } from "@/components/ui/separator";

export default function Page() {
  const [activeTab, setActiveTab] = useState("data");

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
          { id: "data", label: "Data table" },
          { id: "activity", label: "Activity" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="px-6"
      />

      {activeTab === "data" ? (
        <BundlesContainer>
          <ErrorBoundary fallback={<BundlesError />}>
            <Suspense fallback={<BundlesLoading />}>
              <BundlesList />
            </Suspense>
          </ErrorBoundary>
        </BundlesContainer>
      ) : (
        <div className="p-6">
          <ActivityTimeline limit={50} />
        </div>
      )}
    </div>
  );
}
