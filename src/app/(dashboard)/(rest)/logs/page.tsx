"use client";

import { Suspense, useState } from "react";
import { LogsTable } from "@/features/ai/components/logs-table";
import { IconLoader as LoaderIcon } from "central-icons/IconLoader";
import { Separator } from "@/components/ui/separator";
import { PageTabs } from "@/components/ui/page-tabs";
import { ActivityTimeline } from "@/features/activity/components/activity-timeline";

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState("data");

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
        tabs={[
          { id: "data", label: "Data table" },
          { id: "activity", label: "Activity" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="px-6"
      />

      {activeTab === "data" ? (
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <LoaderIcon className="size-8 animate-spin text-primary/60" />
            </div>
          }
        >
          <LogsTable />
        </Suspense>
      ) : (
        <div className="p-6">
          <ActivityTimeline limit={50} />
        </div>
      )}
    </div>
  );
}
