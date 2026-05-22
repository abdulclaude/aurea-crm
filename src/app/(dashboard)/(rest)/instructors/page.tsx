"use client";

import { LoaderCircle } from "lucide-react";
import { Suspense, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { InstructorsTable } from "@/features/instructors/components/instructors-table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { IconConstructionHelmet as UserPlusIcon } from "central-icons/IconConstructionHelmet";
import { CreateInstructorDialog } from "@/features/instructors/components/create-instructor-dialog";
import { PageTabs } from "@/components/ui/page-tabs";
import { ActivityTimeline } from "@/features/activity/components/activity-timeline";
import { useTRPC } from "@/trpc/client";

export default function InstructorsPage() {
  const trpc = useTRPC();

  // Check if user is at studio level (no active location)
  const { data: active } = useSuspenseQuery(
    trpc.organizations.getActive.queryOptions(),
  );

  const isStudioLevel = !active?.activeLocationId;

  const [activeTab, setActiveTab] = useState(
    isStudioLevel ? "studio-data" : "data",
  );

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

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-2 p-6 pb-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Instructors</h1>
          <p className="text-xs text-primary/75">
            Manage instructors and portal access
          </p>
        </div>

        <CreateInstructorDialog>
          <Button variant="outline" size="sm">
            <UserPlusIcon className="size-3.5" />
            Add instructor
          </Button>
        </CreateInstructorDialog>
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
            <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground text-sm text-primary flex items-center justify-center gap-3 p-6">
              <LoaderCircle className="size-3.5 animate-spin" />
              Loading instructors...
            </div>
          }
        >
          <InstructorsTable scope="agency" />
        </Suspense>
      ) : activeTab === "locations-data" ? (
        <Suspense
          fallback={
            <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground text-sm text-primary flex items-center justify-center gap-3 p-6">
              <LoaderCircle className="size-3.5 animate-spin" />
              Loading instructors...
            </div>
          }
        >
          <InstructorsTable scope="all-clients" />
        </Suspense>
      ) : (
        <div className="p-6">
          <ActivityTimeline limit={50} filterByEntityType="instructor" />
        </div>
      )}
    </div>
  );
}
