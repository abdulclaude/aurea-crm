"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { IconLoader as LoaderIcon } from "central-icons/IconLoader";
import { IconPeopleAdd as UserPlusIcon } from "central-icons/IconPeopleAdd";
import * as React from "react";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { InviteMemberDialog } from "@/features/organizations/components/invite-member-dialog";
import { MembersTable } from "@/features/organizations/components/members-table";
import { useTRPC } from "@/trpc/client";
import { Separator } from "@/components/ui/separator";
import { PageTabs } from "@/components/ui/page-tabs";
import { ActivityTimeline } from "@/features/activity/components/activity-timeline";

function MembersPageContent() {
  const trpc = useTRPC();
  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("data");

  // Get active organization/location context
  const { data: active } = useSuspenseQuery(
    trpc.organizations.getActive.queryOptions(),
  );

  const { data: orgs } = useSuspenseQuery(
    trpc.organizations.getMyOrganizations.queryOptions(),
  );

  const activeOrg =
    orgs?.find((o) => o.id === active?.activeOrganizationId) ?? orgs?.[0];
  const activeLocation = active?.activeLocation;

  // Allow access if user has either an organization OR a location
  if (!activeOrg && !activeLocation) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-muted-foreground">
          No organization or workspace found
        </p>
      </div>
    );
  }

  const contextName = activeLocation
    ? activeLocation.companyName
    : (activeOrg?.name ?? "Organization");

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between px-6 pt-6 pb-6">
        <div>
          <h1 className="text-xl font-bold text-primary dark:text-white">
            Team
          </h1>
          <p className=" text-xs text-primary/60 dark:text-white/50">
            Manage your team at {contextName}
          </p>
        </div>

        <Button
          onClick={() => setInviteDialogOpen(true)}
          className="gap-2 h-8.5! bg-background hover:bg-primary-foreground/50 hover:text-black text-primary text-xs rounded-lg"
          variant="outline"
          size="sm"
        >
          <UserPlusIcon className="size-4" />
          Invite member
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
            <div className="flex min-h-[400px] items-center justify-center">
              <LoaderIcon className="h-8 w-8 animate-spin text-primary" />
            </div>
          }
        >
          <MembersTable />
        </Suspense>
      ) : (
        <div className="p-6">
          <ActivityTimeline limit={50} />
        </div>
      )}

      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        mode={activeLocation ? "location" : "organization"}
        organizationId={activeOrg?.id}
        locationId={activeLocation?.id}
      />
    </div>
  );
}

export default function MembersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <LoaderIcon className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <MembersPageContent />
    </Suspense>
  );
}
