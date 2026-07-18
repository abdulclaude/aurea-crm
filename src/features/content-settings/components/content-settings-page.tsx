"use client";

import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTabPanel, PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { ContentLibraryKind } from "@/features/content-settings/contracts";
import { useTRPC } from "@/trpc/client";

import { ContentLibraryPanel } from "./content-library-panel";

const tabs = [
  { id: "TERMINOLOGY_PACK", label: "Terminology" },
  { id: "FAQ_COLLECTION", label: "FAQs" },
  { id: "MESSAGE_MACRO", label: "Message macros" },
  { id: "PUBLIC_PROFILE", label: "Public profiles" },
] as const;

export function ContentSettingsPage(): React.JSX.Element {
  const trpc = useTRPC();
  const [kind, setKind] = React.useState<ContentLibraryKind>("TERMINOLOGY_PACK");
  const [search, setSearch] = React.useState("");
  const [includeArchived, setIncludeArchived] = React.useState(false);
  const permissions = useQuery(trpc.permissions.getCurrent.queryOptions());
  const items = useQuery(trpc.contentSettings.list.queryOptions({ kind, search, includeArchived }));
  const canManage = permissions.data?.capabilities.includes("settings.manage") ?? false;

  if (permissions.isLoading || items.isLoading) return <div role="status" className="p-6 text-xs text-muted-foreground">Loading reusable content</div>;
  if (permissions.isError || items.isError) {
    return <div className="p-6"><Alert variant="destructive" className="max-w-3xl"><AlertTitle>Reusable content could not be loaded</AlertTitle><AlertDescription className="space-y-2"><p>{permissions.error?.message ?? items.error?.message}</p><Button type="button" size="sm" variant="outline" onClick={() => void Promise.all([permissions.refetch(), items.refetch()])}>Try again</Button></AlertDescription></Alert></div>;
  }

  return (
    <div>
      <div className="p-6"><h1 className="text-lg font-semibold">Content settings</h1><p className="text-xs text-muted-foreground">Manage reusable workspace language, FAQs, message copy, and public profile content.</p></div>
      <Separator />
      <PageTabs tabs={tabs} activeTab={kind} onTabChange={(value) => setKind(value as ContentLibraryKind)} className="px-6" idPrefix="content-settings" ariaLabel="Content settings sections" />
      <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3"><Input className="max-w-xs" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or key" aria-label="Search reusable content" /><div className="flex items-center gap-2"><Switch id="include-archived-content" checked={includeArchived} onCheckedChange={setIncludeArchived} /><label htmlFor="include-archived-content" className="text-xs">Show archived</label></div></div>
      {tabs.map((tab) => <PageTabPanel key={tab.id} idPrefix="content-settings" tabId={tab.id} activeTab={kind} className="p-6"><ContentLibraryPanel kind={tab.id} items={tab.id === kind ? (items.data ?? []) : []} canManage={canManage} onRefresh={async () => { await items.refetch(); }} /></PageTabPanel>)}
    </div>
  );
}
