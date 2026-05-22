"use client";

import { LoaderCircle } from "lucide-react";
import { Suspense, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { ClientsTable } from "@/features/crm/components/clients-table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { PageTabs } from "@/components/ui/page-tabs";

import { IconPeopleAdd as AddClientIcon } from "central-icons/IconPeopleAdd";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ActivityTimeline } from "@/features/activity/components/activity-timeline";
import { useTRPC } from "@/trpc/client";

export default function ClientsPage() {
  const trpc = useTRPC();
  const searchParams = useSearchParams();

  // Check if user is at studio level (no active location)
  const { data: active } = useSuspenseQuery(
    trpc.organizations.getActive.queryOptions(),
  );

  const isStudioLevel = !active?.activeLocationId;

  // Define tabs based on context
  const tabs = isStudioLevel
    ? [
        { id: "studio-data", label: "Studio data" },
        { id: "leads", label: "Leads" },
        { id: "locations-data", label: "All locations data" },
        { id: "activity", label: "Activity timeline" },
      ]
    : [
        { id: "data", label: "Data table" },
        { id: "leads", label: "Leads" },
        { id: "activity", label: "Activity timeline" },
      ];

  const requestedView = searchParams.get("view");
  const [activeTab, setActiveTab] = useState(
    requestedView === "leads" ? "leads" : tabs[0].id,
  );

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-2 p-6 pb-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Clients</h1>
          <p className="text-xs text-primary/75">
            Manage your studio clients and leads
          </p>
        </div>

        <Button variant="outline" size="sm" asChild>
          <Link href="/clients/new">
            <AddClientIcon className="size-3.5" />
            Add member{" "}
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

      <Separator className="bg-black/5 dark:bg-white/5" />

      {activeTab === "data" || activeTab === "studio-data" ? (
        <Suspense
          fallback={
            <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground p-6 text-sm text-primary flex items-center justify-center gap-3 h-full">
              <LoaderCircle className="size-3.5 animate-spin" />
              Loading members...
            </div>
          }
        >
          <ClientsTable scope="agency" clientView="members" />
        </Suspense>
      ) : activeTab === "leads" ? (
        <Suspense
          fallback={
            <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground p-6 text-sm text-primary flex items-center justify-center gap-3 h-full">
              <LoaderCircle className="size-3.5 animate-spin" />
              Loading leads...
            </div>
          }
        >
          <ClientsTable scope="agency" clientView="leads" />
        </Suspense>
      ) : activeTab === "locations-data" ? (
        <Suspense
          fallback={
            <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground p-6 text-sm text-primary flex items-center justify-center gap-3">
              <LoaderCircle className="size-3.5 animate-spin" />
              Loading members...
            </div>
          }
        >
          <ClientsTable scope="all-clients" />
        </Suspense>
      ) : (
        <ActivityTimeline limit={50} filterByEntityType="client" />
      )}
    </div>
  );
}
