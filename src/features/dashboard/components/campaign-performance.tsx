"use client";

import Link from "next/link";
import { Send } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SectionShell } from "./section-shell";

type CampaignPerformanceRow = {
  id: string;
  name: string;
  status: string;
  totalRecipients: number;
  delivered: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
};

export function CampaignPerformance({
  data,
  isEditing,
}: {
  data: CampaignPerformanceRow[] | undefined;
  isEditing?: boolean;
}) {
  return (
    <SectionShell
      title="Campaign performance"
      subtitle="Recent sends"
      isEditing={isEditing}
      right={
        <Link
          href="/campaigns"
          className="text-[11px] font-medium text-black/40 hover:text-black/70"
        >
          Campaigns →
        </Link>
      }
    >
      {data && data.length > 0 ? (
        <div className="flex flex-col">
          {data.map((row, index) => (
            <div key={row.id}>
              <Link href={`/campaigns/${row.id}`}>
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3.5 py-3 transition-colors hover:bg-black/[0.015]">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-black/70">
                      {row.name}
                    </p>
                    <p className="text-[11px] text-black/35">
                      {(row.delivered || row.totalRecipients).toLocaleString()} delivered · {row.status.toLowerCase()}
                    </p>
                  </div>
                  <Metric label="open" value={`${row.openRate}%`} />
                  <Metric label="click" value={`${row.clickRate}%`} />
                </div>
              </Link>
              {index < data.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <Send className="mb-2 size-5 text-black/50" />
          <p className="text-[12px] text-black/40">No campaign performance yet</p>
          <Link
            href="/campaigns/new"
            className="mt-2 text-[11px] font-medium text-black/50 underline underline-offset-4 hover:text-black/70"
          >
            Create campaign
          </Link>
        </div>
      )}
    </SectionShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="shrink-0 text-right">
      <p className="text-[13px] font-semibold text-black/70">{value}</p>
      <p className="text-[10px] text-black/35">{label}</p>
    </div>
  );
}
