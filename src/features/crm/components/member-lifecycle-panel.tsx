"use client";

import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import type { MemberLifecycleView } from "./member-lifecycle-types";
import { OverviewView } from "./member-lifecycle-overview";
import {
  ActivityView,
  PaymentsView,
  WaiversView,
} from "./member-lifecycle-status-views";

type MemberLifecyclePanelProps = {
  clientId: string;
  view: MemberLifecycleView;
};

export function MemberLifecyclePanel({
  clientId,
  view,
}: MemberLifecyclePanelProps) {
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

  if (view === "payments") return <PaymentsView data={data} />;
  if (view === "waivers") return <WaiversView data={data} />;
  if (view === "activity") return <ActivityView data={data} />;

  return <OverviewView data={data} />;
}
