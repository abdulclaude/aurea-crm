"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageTabPanel, PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

import { BookingPolicyEditorDialog } from "./booking-policy-editor-dialog";
import { PolicyHistoryDialog } from "./policy-history-dialog";
import { PolicyListPanel } from "./policy-list-panel";
import { PolicyPreviewPanel } from "./policy-preview-panel";
import { ServicePolicyAssignments } from "./service-policy-assignments";
import type {
  PolicyEditorMode,
  SchedulingPolicy,
  SchedulingPolicyKind,
} from "./types";
import { WaitlistPolicyEditorDialog } from "./waitlist-policy-editor-dialog";

const TABS = [
  { id: "booking", label: "Booking windows" },
  { id: "waitlists", label: "Waitlists" },
  { id: "assignments", label: "Service assignments" },
  { id: "preview", label: "Resolution preview" },
] as const;
type SchedulingTab = (typeof TABS)[number]["id"];

type EditorState = {
  kind: SchedulingPolicyKind;
  mode: PolicyEditorMode;
  policy: SchedulingPolicy | null;
};

export function SchedulingSettingsPage() {
  const trpc = useTRPC();
  const [hydrated, setHydrated] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<SchedulingTab>("booking");
  const [editor, setEditor] = React.useState<EditorState | null>(null);
  const [historyPolicy, setHistoryPolicy] =
    React.useState<SchedulingPolicy | null>(null);
  const permissions = useQuery(trpc.permissions.getCurrent.queryOptions());
  const policies = useQuery(trpc.schedulingPolicy.list.queryOptions());
  React.useEffect(() => setHydrated(true), []);
  const canManage =
    hydrated &&
    Boolean(permissions.data?.capabilities.includes("settings.manage"));

  if (!hydrated || policies.isLoading || permissions.isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="space-y-4 p-8"
      >
        <span className="sr-only">Loading scheduling policies</span>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (
    policies.isError ||
    permissions.isError ||
    !policies.data ||
    !permissions.data
  ) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">Scheduling policies</h1>
        <p
          role="alert"
          className="mt-4 rounded-md border border-destructive/30 p-4 text-sm text-destructive"
        >
          {policies.error?.message ??
            permissions.error?.message ??
            "Scheduling policies could not be loaded."}
        </p>
      </div>
    );
  }

  const openEditor = (
    kind: SchedulingPolicyKind,
    mode: PolicyEditorMode,
    policy: SchedulingPolicy | null = null,
  ) => setEditor({ kind, mode, policy });
  const historyOwned =
    historyPolicy?.locationId === policies.data.scope.locationId;

  return (
    <div className="min-w-0">
      <header className="p-6 sm:p-8">
        <h1 className="text-xl font-semibold">Scheduling policies</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Version booking windows and waitlist behavior, then assign them to
          services or classes.
        </p>
      </header>
      <Separator />
      {!canManage ? (
        <div className="px-6 py-4 sm:px-8">
          <Alert>
            <AlertTitle>Read-only access</AlertTitle>
            <AlertDescription>
              You can review policy resolution and history, but managing
              settings requires the settings management capability.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
      <PageTabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as SchedulingTab)}
        className="px-6 sm:px-8"
        ariaLabel="Scheduling policy settings"
        idPrefix="scheduling-settings"
      />
      <PageTabPanel
        idPrefix="scheduling-settings"
        tabId="booking"
        activeTab={activeTab}
      >
        <PolicyListPanel
          kind="BOOKING_WINDOW"
          policies={policies.data.bookingWindows}
          canManage={canManage}
          scopeLocationId={policies.data.scope.locationId}
          onCreate={() => openEditor("BOOKING_WINDOW", "CREATE")}
          onVersion={(policy) =>
            openEditor("BOOKING_WINDOW", "VERSION", policy)
          }
          onClone={(policy) => openEditor("BOOKING_WINDOW", "CLONE", policy)}
          onHistory={setHistoryPolicy}
        />
      </PageTabPanel>
      <PageTabPanel
        idPrefix="scheduling-settings"
        tabId="waitlists"
        activeTab={activeTab}
      >
        <PolicyListPanel
          kind="WAITLIST"
          policies={policies.data.waitlists}
          canManage={canManage}
          scopeLocationId={policies.data.scope.locationId}
          onCreate={() => openEditor("WAITLIST", "CREATE")}
          onVersion={(policy) => openEditor("WAITLIST", "VERSION", policy)}
          onClone={(policy) => openEditor("WAITLIST", "CLONE", policy)}
          onHistory={setHistoryPolicy}
        />
      </PageTabPanel>
      <PageTabPanel
        idPrefix="scheduling-settings"
        tabId="assignments"
        activeTab={activeTab}
      >
        <ServicePolicyAssignments
          services={policies.data.services}
          bookingPolicies={policies.data.bookingWindows}
          waitlistPolicies={policies.data.waitlists}
          canManage={canManage}
        />
      </PageTabPanel>
      <PageTabPanel
        idPrefix="scheduling-settings"
        tabId="preview"
        activeTab={activeTab}
      >
        <PolicyPreviewPanel
          services={policies.data.services}
          bookingPolicies={policies.data.bookingWindows}
          waitlistPolicies={policies.data.waitlists}
        />
      </PageTabPanel>

      <BookingPolicyEditorDialog
        open={editor?.kind === "BOOKING_WINDOW"}
        mode={editor?.kind === "BOOKING_WINDOW" ? editor.mode : "CREATE"}
        policy={
          editor?.policy?.kind === "BOOKING_WINDOW" ? editor.policy : null
        }
        onOpenChange={(open) => !open && setEditor(null)}
      />
      <WaitlistPolicyEditorDialog
        open={editor?.kind === "WAITLIST"}
        mode={editor?.kind === "WAITLIST" ? editor.mode : "CREATE"}
        policy={editor?.policy?.kind === "WAITLIST" ? editor.policy : null}
        onOpenChange={(open) => !open && setEditor(null)}
      />
      <PolicyHistoryDialog
        open={Boolean(historyPolicy)}
        policy={historyPolicy}
        canManage={canManage && historyOwned}
        onOpenChange={(open) => !open && setHistoryPolicy(null)}
      />
    </div>
  );
}
