"use client";

import { LoaderCircle } from "lucide-react";
import { Suspense, useState } from "react";

import { ContactsTable } from "@/features/crm/components/contacts-table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { PageTabs } from "@/components/ui/page-tabs";

import { IconPeopleAdd as AddContactIcon } from "central-icons/IconPeopleAdd";
import Link from "next/link";
import { ActivityTimeline } from "@/features/activity/components/activity-timeline";

export default function ContactsPage() {
  const [activeTab, setActiveTab] = useState("data");

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-2 p-6 pb-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Contacts</h1>
          <p className="text-xs text-primary/75">
            Keep track of your contacts and leads
          </p>
        </div>

        <Button variant="outline" size="sm" asChild>
          <Link href="/contacts/new">
            <AddContactIcon className="size-3.5" />
            Add contact{" "}
          </Link>
        </Button>
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
            <div className="border-y border-black/5 dark:border-white/5 bg-primary-foreground p-6 text-sm text-primary flex items-center justify-center gap-3">
              <LoaderCircle className="size-3.5 animate-spin" />
              Loading contacts...
            </div>
          }
        >
          <ContactsTable />
        </Suspense>
      ) : (
        <div className="p-6">
          <ActivityTimeline limit={50} filterByEntityType="CONTACT" />
        </div>
      )}
    </div>
  );
}
