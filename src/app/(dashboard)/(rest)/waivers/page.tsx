"use client";

import { FilePlus2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";
import { AddWaiverDialog } from "@/features/waivers/components/add-waiver-dialog";
import { WaiverSignaturesTable } from "@/features/waivers/components/waiver-signatures-table";
import { WaiverTemplatesTable } from "@/features/waivers/components/waiver-templates-table";

type WaiverTab = "templates" | "signatures";

const WAIVER_TABS = [
  { id: "templates", label: "Waiver templates" },
  { id: "signatures", label: "Signature history" },
] satisfies Array<{ id: WaiverTab; label: string }>;

function isWaiverTab(value: string): value is WaiverTab {
  return WAIVER_TABS.some((tab) => tab.id === value);
}

export default function WaiversPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCreate = searchParams.get("create") === "1";
  const [activeTab, setActiveTab] = React.useState<WaiverTab>("templates");
  const [addOpen, setAddOpen] = React.useState(requestedCreate);

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-4 p-6 pb-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Waivers</h1>
          <p className="text-xs text-primary/75">
            Manage waiver templates and client signatures
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <FilePlus2 className="size-3.5" /> Add waiver
        </Button>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />
      <PageTabs
        tabs={WAIVER_TABS}
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (isWaiverTab(tab)) setActiveTab(tab);
        }}
        className="px-6"
      />


      {activeTab === "templates" ? (
        <WaiverTemplatesTable />
      ) : (
        <WaiverSignaturesTable />
      )}

      <AddWaiverDialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open && requestedCreate) router.replace("/waivers");
        }}
      />
    </div>
  );
}
