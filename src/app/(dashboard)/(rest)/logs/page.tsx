"use client";

import { Suspense, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { LogsTable } from "@/features/ai/components/logs-table";
import { IconLoader as LoaderIcon } from "central-icons/IconLoader";
import { Separator } from "@/components/ui/separator";
import { PageTabs } from "@/components/ui/page-tabs";
import { ActivityTimeline } from "@/features/activity/components/activity-timeline";
import { useTRPC } from "@/trpc/client";

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState("agency-data");
  const trpc = useTRPC();

  // Check if user is at agency level (no active subaccount)
  const { data: active } = useSuspenseQuery(
    trpc.organizations.getActive.queryOptions()
  );

  const isAgencyLevel = !active?.activeSubaccountId;

  // Define tabs based on context
  const tabs = isAgencyLevel
    ? [
        { id: "agency-data", label: "Agency data" },
        { id: "clients-data", label: "All clients data" },
        { id: "activity", label: "Activity timeline" },
      ]
    : [
        { id: "data", label: "Data table" },
        { id: "activity", label: "Activity timeline" },
      ];

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between p-6 pb-6">
        <div>
          <h1 className="text-xl font-bold text-primary">AI Logs</h1>

          <p className="text-xs text-primary/75">
            View and manage all AI assistant interactions and logs
          </p>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <PageTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="px-6"
      />

      {(activeTab === "data" || activeTab === "agency-data") ? (
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <LoaderIcon className="size-8 animate-spin text-primary/60" />
            </div>
          }
        >
          <LogsTable scope="agency" />
        </Suspense>
      ) : activeTab === "clients-data" ? (
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <LoaderIcon className="size-8 animate-spin text-primary/60" />
            </div>
          }
        >
          <LogsTable scope="all-clients" />
        </Suspense>
      ) : (
        <div className="p-6">
          <ActivityTimeline limit={50} />
        </div>
      )}
    </div>
  );
}
