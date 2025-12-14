"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageTabs } from "@/components/ui/page-tabs";

import { DealsTable } from "@/features/crm/components/deals-table";
import { IconFistbump as AddDealIcon } from "central-icons/IconFistbump";
import { Badge } from "@/components/ui/badge";
import { ActivityTimeline } from "@/features/activity/components/activity-timeline";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export default function DealsPage() {
  const [activeTab, setActiveTab] = useState("agency-data");
  const trpc = useTRPC();

  // Check if user is at agency level (no active subaccount)
  const { data: active } = useSuspenseQuery(
    trpc.organizations.getActive.queryOptions()
  );

  const isAgencyLevel = !active?.activeSubaccountId;

  const { data: contactCount = 0 } = useQuery({
    ...trpc.contacts.count.queryOptions(),
  });

  const { data: pipelineCount = 0 } = useQuery({
    ...trpc.pipelines.count.queryOptions(),
  });

  const hasContacts = contactCount > 0;
  const hasPipelines = pipelineCount > 0;

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
      <div className="flex items-end justify-between gap-2 p-6">
        <div>
          <h1 className="text-lg font-semibold text-primary dark:text-white">
            Deals
          </h1>
          <p className="text-xs text-primary/75 dark:text-white/50">
            Manage your sales pipeline and deals
          </p>
        </div>

        {hasContacts ? (
          <Button variant="outline" size="sm" asChild>
            <Link href="/deals/new">
              <AddDealIcon className="size-3.5 " />
              Add deal
            </Link>
          </Button>
        ) : (
          <Badge className="text-xs rounded-full px-3 py-1.5 bg-rose-600 text-white ring ring-black/10 shadow-sm">
            Cannot make any deals until a contact has been added
          </Badge>
        )}

        {!hasPipelines && (
          <Badge className="text-xs rounded-full px-3 py-1.5 bg-rose-600 text-white ring ring-black/10 shadow-sm">
            Cannot make any deals until a pipeline has been created
          </Badge>
        )}
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
            <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground p-6 text-sm text-primary/75 flex items-center justify-center gap-3">
              <LoaderCircle className="size-3.5 animate-spin" />
              Loading deals...
            </div>
          }
        >
          <DealsTable scope="agency" />
        </Suspense>
      ) : activeTab === "clients-data" ? (
        <Suspense
          fallback={
            <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground p-6 text-sm text-primary/75 flex items-center justify-center gap-3">
              <LoaderCircle className="size-3.5 animate-spin" />
              Loading deals...
            </div>
          }
        >
          <DealsTable scope="all-clients" />
        </Suspense>
      ) : (
        <div className="p-6">
          <ActivityTimeline limit={50} filterByEntityType="deal" />
        </div>
      )}
    </div>
  );
}
