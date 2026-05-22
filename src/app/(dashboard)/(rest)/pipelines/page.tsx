"use client";

import { LoaderCircle } from "lucide-react";
import { Suspense, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { PipelinesTable } from "@/features/crm/components/pipelines-table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { PageTabs } from "@/components/ui/page-tabs";

import { IconVerticalAlignmentCenter as AddPipelineIcon } from "central-icons/IconVerticalAlignmentCenter";
import Link from "next/link";
import { ActivityTimeline } from "@/features/activity/components/activity-timeline";
import { useTRPC } from "@/trpc/client";

export default function PipelinesPage() {
  const trpc = useTRPC();

  // Check if user is at studio level (no active location)
  const { data: active } = useSuspenseQuery(
    trpc.organizations.getActive.queryOptions()
  );

  const isStudioLevel = !active?.activeLocationId;

  // Define tabs based on context
  const tabs = isStudioLevel
    ? [
        { id: "studio-data", label: "Studio data" },
        { id: "locations-data", label: "All locations data" },
        { id: "activity", label: "Activity timeline" },
      ]
    : [
        { id: "data", label: "Data table" },
        { id: "activity", label: "Activity timeline" },
      ];

  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-2 p-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Pipelines</h1>
          <p className="text-xs text-primary/75">
            Create and manage your sales pipelines
          </p>
        </div>

        <Button variant="outline" size="sm" asChild>
          <Link href="/pipelines/new">
            <AddPipelineIcon className="size-3.5" />
            Create pipeline{" "}
          </Link>
        </Button>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <PageTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="px-6"
      />

      {activeTab === "data" || activeTab === "studio-data" ? (
        <Suspense
          fallback={
            <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground p-6 text-sm text-primary/75 flex items-center justify-center gap-3">
              <LoaderCircle className="size-3.5 animate-spin" />
              Loading pipelines...
            </div>
          }
        >
          <PipelinesTable scope="agency" />
        </Suspense>
      ) : activeTab === "locations-data" ? (
        <Suspense
          fallback={
            <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground p-6 text-sm text-primary/75 flex items-center justify-center gap-3">
              <LoaderCircle className="size-3.5 animate-spin" />
              Loading pipelines...
            </div>
          }
        >
          <PipelinesTable scope="all-clients" />
        </Suspense>
      ) : (
        <div className="p-6">
          <ActivityTimeline limit={50} filterByEntityType="pipeline" />
        </div>
      )}
    </div>
  );
}
