"use client";

import * as React from "react";
import { Suspense } from "react";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { InviteMembersSection } from "@/features/organizations/components/invite-members-section";
import { IconLoader as LoaderIcon } from "central-icons/IconLoader";

function InvitesPageContent() {
  const trpc = useTRPC();

  // Get active organization/location context
  const { data: active } = useSuspenseQuery(
    trpc.organizations.getActive.queryOptions()
  );

  const { data: orgs } = useSuspenseQuery(
    trpc.organizations.getMyOrganizations.queryOptions()
  );

  const activeOrg =
    orgs?.find((o) => o.id === active?.activeOrganizationId) ?? orgs?.[0];
  const activeLocation = active?.activeLocation;

  // Allow access if user has either an organization OR a location
  if (!activeOrg && !activeLocation) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-muted-foreground">
          No studio or location found
        </p>
      </div>
    );
  }

  return (
    <div className=" py-8">
      <div className="px-6 ">
        <h1 className="text-lg font-semibold text-primary dark:text-white">
          Team invitations
        </h1>

        <p className="text-xs text-primary/60">
          Invite team members to join{" "}
          {activeLocation
            ? activeLocation.companyName
            : (activeOrg?.name ?? "Studio")}
        </p>
      </div>

      <InviteMembersSection
        mode={activeLocation ? "location" : "organization"}
        organizationName={activeOrg?.name ?? "Studio"}
        locationName={activeLocation?.companyName}
      />
    </div>
  );
}

export default function InvitesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <LoaderIcon className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <InvitesPageContent />
    </Suspense>
  );
}
