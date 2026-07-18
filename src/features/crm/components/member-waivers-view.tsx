"use client";

import { isPast } from "date-fns";
import { FilePlus2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { PageTabs } from "@/components/ui/page-tabs";
import { MemberDataTable } from "./member-data-table";
import type { LifecycleSummary } from "./member-lifecycle-types";
import { labelize } from "./member-lifecycle-types";
import {
  signatureColumns,
  type SignatureRow,
  waiverColumns,
  type WaiverRow,
} from "./member-waiver-columns";

type WaiverTab = "required" | "missing" | "signatures";
const WAIVER_TABS = [
  { id: "required", label: "Required waivers" },
  { id: "missing", label: "Missing waivers" },
  { id: "signatures", label: "Signature history" },
] satisfies Array<{ id: WaiverTab; label: string }>;

function isWaiverTab(value: string): value is WaiverTab {
  return WAIVER_TABS.some((tab) => tab.id === value);
}

export function MemberWaiversView({ data }: { data: LifecycleSummary }) {
  const [activeTab, setActiveTab] = React.useState<WaiverTab>("required");
  const [statuses, setStatuses] = React.useState<string[]>([]);
  const missingIds = new Set(data.waivers.missing.map((waiver) => waiver.id));
  const requiredRows: WaiverRow[] = data.waivers.required.map((waiver) => ({
    ...waiver,
    status: missingIds.has(waiver.id) ? "MISSING" : "SIGNED",
  }));
  const missingRows: WaiverRow[] = data.waivers.missing.map((waiver) => ({
    ...waiver,
    status: "MISSING",
  }));
  const signatureRows: SignatureRow[] = data.waivers.signatures.map(
    (signature) => ({
      ...signature,
      status:
        signature.expiresAt && isPast(new Date(signature.expiresAt))
          ? "EXPIRED"
          : "CURRENT",
    }),
  );
  const rows = activeTab === "required" ? requiredRows : missingRows;
  const visibleRows = statuses.length
    ? rows.filter((row) => statuses.includes(row.status))
    : rows;
  const visibleSignatures = statuses.length
    ? signatureRows.filter((row) => statuses.includes(row.status))
    : signatureRows;
  const statusOptions = Array.from(
    new Set(
      (activeTab === "signatures" ? signatureRows : rows).map(
        (row) => row.status,
      ),
    ),
  ).map((status) => ({ value: status, label: labelize(status) }));

  return (
    <div className="space-y-4">
      <div className="relative">
        <PageTabs
          tabs={WAIVER_TABS}
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (isWaiverTab(tab)) {
              setActiveTab(tab);
              setStatuses([]);
            }
          }}
          className="px-4 pr-36 sm:px-6 sm:pr-40"
        />
        <Button
          asChild
          variant="outline"
          size="sm"
          className="absolute right-4 top-1 sm:right-6"
        >
          <Link href="/waivers?create=1">
            <FilePlus2 className="size-3.5" /> Add waiver
          </Link>
        </Button>
      </div>

      {activeTab === "signatures" ? (
        <MemberDataTable
          columns={signatureColumns}
          data={visibleSignatures}
          getRowId={(signature) => signature.id}
          initialColumnOrder={[
            "name",
            "version",
            "signedAt",
            "expiresAt",
            "status",
          ]}
          primaryColumnId="name"
          searchPlaceholder="Search signature history..."
          emptyLabel="No signatures collected for this client."
          filterGroups={[
            {
              label: "Signature status",
              options: statusOptions,
              selectedValues: statuses,
              onChange: setStatuses,
            },
          ]}
        />
      ) : (
        <MemberDataTable
          columns={waiverColumns}
          data={visibleRows}
          getRowId={(waiver) => waiver.id}
          initialColumnOrder={["name", "version", "status"]}
          primaryColumnId="name"
          searchPlaceholder={`Search ${activeTab} waivers...`}
          emptyLabel={
            activeTab === "missing"
              ? "This client has no missing waivers."
              : "No required waiver templates are configured."
          }
          filterGroups={[
            {
              label: "Client status",
              options: statusOptions,
              selectedValues: statuses,
              onChange: setStatuses,
            },
          ]}
        />
      )}
    </div>
  );
}
