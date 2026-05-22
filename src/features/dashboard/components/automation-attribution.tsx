"use client";

import Link from "next/link";
import { Workflow } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SectionShell } from "./section-shell";

type AutomationAttributionRow = {
  workflowId: string;
  workflowName: string;
  conversions: number;
  value: number;
};

export function AutomationAttribution({
  data,
  isEditing,
}: {
  data: AutomationAttributionRow[] | undefined;
  isEditing?: boolean;
}) {
  return (
    <SectionShell
      title="Automation attribution"
      subtitle="Conversion events"
      isEditing={isEditing}
      right={
        <Link
          href="/executions"
          className="text-[11px] font-medium text-black/40 hover:text-black/70"
        >
          Executions →
        </Link>
      }
    >
      {data && data.length > 0 ? (
        <div className="flex flex-col">
          {data.map((row, index) => (
            <div key={row.workflowId || row.workflowName}>
              <Link href={row.workflowId ? `/workflows/${row.workflowId}` : "/workflows"}>
                <div className="flex items-center justify-between gap-3 px-3.5 py-3 transition-colors hover:bg-black/[0.015]">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-black/70">
                      {row.workflowName}
                    </p>
                    <p className="text-[11px] text-black/35">
                      {row.value < 0 ? `-£${Math.abs(row.value).toLocaleString()}` : `£${row.value.toLocaleString()}`} attributed value
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[15px] font-semibold text-black/70">
                      {row.conversions.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-black/35">conversions</p>
                  </div>
                </div>
              </Link>
              {index < data.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <Workflow className="mb-2 size-5 text-black/50" />
          <p className="text-[12px] text-black/40">No attributed conversions yet</p>
          <Link
            href="/workflows"
            className="mt-2 text-[11px] font-medium text-black/50 underline underline-offset-4 hover:text-black/70"
          >
            Create a workflow
          </Link>
        </div>
      )}
    </SectionShell>
  );
}
