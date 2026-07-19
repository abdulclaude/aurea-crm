"use client";

import { LoaderCircle } from "lucide-react";
import { Suspense, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { ClientsTable } from "@/features/crm/components/clients-table";
import { SavedAudiencesPanel } from "@/features/audiences/components";
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
  const { data: permissions } = useSuspenseQuery(
    trpc.permissions.getCurrent.queryOptions(),
  );

  const isStudioLevel = !active?.activeLocationId;
  const canViewAudiences = permissions.capabilities.includes("audience.view");
  const canManageAudiences = permissions.capabilities.includes("audience.manage");
  const canManageClients = permissions.capabilities.includes("customer.manage");
  const canExportClients = permissions.capabilities.includes("privacy.export");

  // Define tabs based on context
  const tabs = isStudioLevel
    ? [
        { id: "studio-data", label: "Studio data" },
        { id: "locations-data", label: "All locations data" },
        ...(canViewAudiences ? [{ id: "audiences", label: "Audiences" }] : []),
        { id: "activity", label: "Activity timeline" },
      ]
    : [
        { id: "data", label: "Data table" },
        ...(canViewAudiences ? [{ id: "audiences", label: "Audiences" }] : []),
        { id: "activity", label: "Activity timeline" },
      ];

  const requestedView = searchParams.get("view");
  const [activeTab, setActiveTab] = useState(
    requestedView === "audiences" && canViewAudiences
      ? requestedView
      : tabs[0].id,
  );

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-2 p-6 pb-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Members</h1>
          <p className="text-xs text-primary/75">
            Manage member profiles, memberships, and activity
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



      {activeTab === "data" || activeTab === "studio-data" ? (
        <Suspense
          fallback={
            <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground p-6 text-sm text-primary flex items-center justify-center gap-3 h-full">
              <LoaderCircle className="size-3.5 animate-spin" />
              Loading members...
            </div>
          }
        >
          <ClientsTable
            scope="agency"
            clientView="all"
            canManage={canManageClients}
            canExport={canExportClients}
          />
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
          <ClientsTable
            scope="all-clients"
            canManage={canManageClients}
            canExport={canExportClients}
          />
        </Suspense>
      ) : activeTab === "audiences" ? (
        <Suspense
          fallback={
            <div className="flex min-h-[420px] items-center justify-center gap-3 border-y border-black/5 p-6 text-sm text-primary dark:border-white/5">
              <LoaderCircle className="size-3.5 animate-spin" />
              Loading audiences...
            </div>
          }
        >
          <SavedAudiencesPanel canManage={canManageAudiences} />
        </Suspense>
      ) : (
        <ActivityTimeline limit={50} filterByEntityType="client" />
      )}
    </div>
  );
}
