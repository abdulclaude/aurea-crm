"use client";

import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { CustomerTimeline } from "@/features/customer-timeline/components/customer-timeline";
import { MemberBookingsView } from "./member-bookings-view";
import { MemberGuestPassesView } from "./member-guest-passes-view";
import { MemberHouseholdsView } from "./member-households-view";
import { MemberInboxView } from "./member-inbox-view";
import type { MemberLifecycleView } from "./member-lifecycle-types";
import { OverviewView } from "./member-lifecycle-overview";
import { PaymentsView } from "./member-lifecycle-status-views";
import { MemberNotesView } from "./member-notes-view";
import { MemberPersonalInfoView } from "./member-personal-info-view";
import { MemberPricingOptionsView } from "./member-pricing-options-view";
import { MemberWaiversView } from "./member-waivers-view";

type MemberLifecyclePanelProps = {
  clientId: string;
  view: MemberLifecycleView;
};

export function MemberLifecyclePanel({
  clientId,
  view,
}: MemberLifecyclePanelProps) {
  if (view === "activity") {
    return <CustomerTimeline clientId={clientId} />;
  }
  if (view === "personal-info") {
    return <MemberPersonalInfoView clientId={clientId} />;
  }
  if (view === "households") {
    return <MemberHouseholdsView clientId={clientId} />;
  }
  if (view === "notes") return <MemberNotesView clientId={clientId} />;
  if (view === "guest-passes") {
    return <MemberGuestPassesView clientId={clientId} />;
  }
  if (view === "inbox") return <MemberInboxView clientId={clientId} />;
  return <LifecycleDataPanel clientId={clientId} view={view} />;
}

function LifecycleDataPanel({ clientId, view }: MemberLifecyclePanelProps) {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.clients.memberLifecycle.queryOptions({ id: clientId }),
  );

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center gap-2 text-xs text-primary/50">
        <LoaderCircle className="size-3.5 animate-spin" />
        Loading lifecycle...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-primary/50">
        No lifecycle data available.
      </div>
    );
  }

  if (view === "bookings") return <MemberBookingsView data={data} />;
  if (view === "pricing-options") {
    return <MemberPricingOptionsView data={data} />;
  }
  if (view === "payments") {
    return <PaymentsView clientId={clientId} data={data} />;
  }
  if (view === "waivers") return <MemberWaiversView data={data} />;
  return <OverviewView data={data} />;
}
