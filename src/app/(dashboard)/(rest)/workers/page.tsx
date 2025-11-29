"use client";

import { LoaderCircle } from "lucide-react";
import { Suspense, useState } from "react";
import { WorkersTable } from "@/features/workers/components/workers-table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { IconConstructionHelmet as UserPlusIcon } from "central-icons/IconConstructionHelmet";
import { CreateWorkerDialog } from "@/features/workers/components/create-worker-dialog";
import { PageTabs } from "@/components/ui/page-tabs";
import { ActivityTimeline } from "@/features/activity/components/activity-timeline";

export default function WorkersPage() {
  const [activeTab, setActiveTab] = useState("data");

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-2 p-6 pb-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Workers</h1>
          <p className="text-xs text-primary/75">
            Manage field workers and portal access
          </p>
        </div>

        <CreateWorkerDialog>
          <Button variant="outline" size="sm">
            <UserPlusIcon className="size-3.5" />
            Add Worker
          </Button>
        </CreateWorkerDialog>
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
            <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground text-sm text-primary flex items-center justify-center gap-3 p-6">
              <LoaderCircle className="size-3.5 animate-spin" />
              Loading workers...
            </div>
          }
        >
          <WorkersTable />
        </Suspense>
      ) : (
        <div className="p-6">
          <ActivityTimeline limit={50} filterByEntityType="WORKER" />
        </div>
      )}
    </div>
  );
}
