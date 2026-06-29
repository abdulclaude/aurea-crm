"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { IconPeopleAdd as UserPlusIcon } from "central-icons/IconPeopleAdd";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";
import { StaffTable } from "@/features/staff/components/staff-table";
import { useTRPC } from "@/trpc/client";

export default function TeamPage() {
  const trpc = useTRPC();
  const { data: active } = useSuspenseQuery(
    trpc.organizations.getActive.queryOptions(),
  );
  const isStudioLevel = !active?.activeLocationId;
  const [activeTab, setActiveTab] = useState(isStudioLevel ? "studio" : "data");

  const tabs = isStudioLevel
    ? [
        { id: "studio", label: "Studio staff" },
        { id: "locations", label: "All locations" },
      ]
    : [{ id: "data", label: "Data table" }];

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-2 p-6 pb-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Team</h1>
          <p className="text-xs text-primary/75">
            Manage team member profiles, pictures, and roles.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/team/new">
            <UserPlusIcon className="size-3.5" />
            Add staff
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
      <Suspense
        fallback={
          <div className="flex items-center justify-center gap-3 border-y border-black/5 bg-primary-foreground p-6 text-sm text-primary dark:border-white/5">
            <LoaderCircle className="size-3.5 animate-spin" />
            Loading staff...
          </div>
        }
      >
        <StaffTable
          scope={activeTab === "locations" ? "all-locations" : "studio"}
        />
      </Suspense>
    </div>
  );
}
