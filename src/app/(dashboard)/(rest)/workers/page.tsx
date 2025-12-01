"use client";

import { LoaderCircle } from "lucide-react";
import { Suspense, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { WorkersTable } from "@/features/workers/components/workers-table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { IconConstructionHelmet as UserPlusIcon } from "central-icons/IconConstructionHelmet";
import { CreateWorkerDialog } from "@/features/workers/components/create-worker-dialog";
import { PageTabs } from "@/components/ui/page-tabs";
import { ActivityTimeline } from "@/features/activity/components/activity-timeline";
import { useTRPC } from "@/trpc/client";

export default function WorkersPage() {
  const trpc = useTRPC();

  // Check if user is at agency level (no active subaccount)
  const { data: active } = useSuspenseQuery(
    trpc.organizations.getActive.queryOptions()
  );

  const isAgencyLevel = !active?.activeSubaccountId;

  const [activeTab, setActiveTab] = useState(
    isAgencyLevel ? "agency-data" : "data"
  );

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
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="px-6"
      />

      {activeTab === "data" || activeTab === "agency-data" ? (
        <Suspense
          fallback={
            <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground text-sm text-primary flex items-center justify-center gap-3 p-6">
              <LoaderCircle className="size-3.5 animate-spin" />
              Loading workers...
            </div>
          }
        >
          <WorkersTable scope="agency" />
        </Suspense>
      ) : activeTab === "clients-data" ? (
        <Suspense
          fallback={
            <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground text-sm text-primary flex items-center justify-center gap-3 p-6">
              <LoaderCircle className="size-3.5 animate-spin" />
              Loading workers...
            </div>
          }
        >
          <WorkersTable scope="all-clients" />
        </Suspense>
      ) : (
        <div className="p-6">
          <ActivityTimeline limit={50} filterByEntityType="worker" />
        </div>
      )}
    </div>
  );
}
