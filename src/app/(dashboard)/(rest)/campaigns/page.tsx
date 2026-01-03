"use client";

import { Suspense, useState } from "react";
import { LoaderCircle, Send, Plus } from "lucide-react";
import Link from "next/link";

import { CampaignsTable } from "@/features/campaigns/components/campaigns-table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { PageTabs } from "@/components/ui/page-tabs";
import { ActivityTimeline } from "@/features/activity/components/activity-timeline";

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState("all");

  const tabs = [
    { id: "all", label: "All campaigns" },
    { id: "drafts", label: "Drafts" },
    { id: "sent", label: "Sent" },
    { id: "scheduled", label: "Scheduled" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-2 p-6 pb-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Email Campaigns</h1>
          <p className="text-xs text-primary/75">
            Create and send email campaigns to your contacts
          </p>
        </div>

        <Button size="sm" asChild>
          <Link href="/campaigns/new">
            <Plus className="h-4 w-4 mr-1.5" />
            New Campaign
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

      {activeTab === "activity" ? (
        <div className="p-6">
          <ActivityTimeline limit={50} filterByEntityType="campaign" />
        </div>
      ) : (
        <div className="p-6">
          <Suspense
            fallback={
              <div className="border border-white/5 bg-primary-foreground p-6 text-sm text-primary flex items-center justify-center gap-3 rounded-lg">
                <LoaderCircle className="size-4 animate-spin" />
                Loading campaigns...
              </div>
            }
          >
            <CampaignsTable />
          </Suspense>
        </div>
      )}
    </div>
  );
}
