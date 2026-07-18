"use client";

import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TABLE_BADGE_COLORS, TableBadge } from "@/components/ui/table-badge";
import { Button } from "@/components/ui/button";
import { PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";
import { MemberLifecyclePanel } from "@/features/crm/components/member-lifecycle-panel";
import type { MemberLifecycleView } from "@/features/crm/components/member-lifecycle-types";
import { MemberProfileActions } from "@/features/crm/components/member-profile-actions";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

const PROFILE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "personal-info", label: "Personal info" },
  { id: "households", label: "Household" },
  { id: "bookings", label: "Bookings" },
  { id: "pricing-options", label: "Pricing options" },
  { id: "payments", label: "Payments" },
  { id: "waivers", label: "Waivers" },
  { id: "notes", label: "Notes" },
  { id: "activity", label: "Activity" },
  { id: "guest-passes", label: "Guest passes" },
  { id: "inbox", label: "Inbox" },
] satisfies Array<{ id: MemberLifecycleView; label: string }>;

function isLifecycleView(value: string | null): value is MemberLifecycleView {
  return PROFILE_TABS.some((tab) => tab.id === value);
}

function isFullWidthView(view: MemberLifecycleView): boolean {
  return [
    "bookings",
    "households",
    "pricing-options",
    "payments",
    "waivers",
    "activity",
    "guest-passes",
    "inbox",
  ].includes(view);
}

export function MemberProfilePageClient({ memberId }: { memberId: string }) {
  const trpc = useTRPC();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const requestedEdit = searchParams.get("edit") === "1";
  const [activeTab, setActiveTab] = React.useState<MemberLifecycleView>(
    requestedEdit
      ? "personal-info"
      : isLifecycleView(requestedTab)
        ? requestedTab
        : "overview",
  );
  const memberQuery = useQuery(
    trpc.clients.getById.queryOptions({ id: memberId }),
  );

  React.useEffect(() => {
    if (isLifecycleView(requestedTab)) setActiveTab(requestedTab);
  }, [requestedTab]);

  if (memberQuery.isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center gap-2 text-xs text-primary/50">
        <LoaderCircle className="size-4 animate-spin" />
        Loading member profile...
      </div>
    );
  }

  if (!memberQuery.data) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-medium text-primary">Member not found</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/clients">Back to members</Link>
        </Button>
      </div>
    );
  }

  const member = memberQuery.data;
  const initials = member.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        "min-h-full",
        activeTab === "inbox" && "flex h-full flex-col overflow-hidden",
      )}
    >
      <header className="shrink-0 space-y-5 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-12 shrink-0">
              <AvatarImage
                src={member.logo ?? undefined}
                alt={member.name}
                className="object-cover"
              />
              <AvatarFallback className="border border-slate-200 bg-slate-100 text-xs font-medium text-slate-900">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold text-primary">
                  {member.name}
                </h1>
                <TableBadge
                  color={TABLE_BADGE_COLORS.teal}
                  className="capitalize"
                >
                  {member.type.toLowerCase().replaceAll("_", " ")}
                </TableBadge>
              </div>
              <p className="truncate text-xs text-primary/55">
                {member.email ?? member.phone ?? "No contact details"}
              </p>
            </div>
          </div>
          <MemberProfileActions member={member} />
        </div>
      </header>

      <Separator className="shrink-0" />
      <PageTabs
        tabs={PROFILE_TABS}
        activeTab={activeTab}
        onTabChange={(tabId) => {
          if (isLifecycleView(tabId)) setActiveTab(tabId);
        }}
        className="shrink-0 overflow-x-auto px-4 [&>button]:shrink-0 [&>button]:whitespace-nowrap sm:px-6"
      />

      <main
        className={cn(
          "min-w-0",
          activeTab === "inbox" &&
            "flex min-h-0 flex-1 flex-col overflow-hidden",
          !isFullWidthView(activeTab) && "px-4 py-5 sm:px-6",
        )}
      >
        <MemberLifecyclePanel clientId={member.id} view={activeTab} />
      </main>
    </div>
  );
}
