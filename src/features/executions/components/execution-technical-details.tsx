"use client";

import { format } from "date-fns";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ExecutionDetail } from "./execution-detail-types";

export function ExecutionTechnicalDetails({
  execution,
}: {
  execution: ExecutionDetail;
}) {
  const [open, setOpen] = useState(false);

  return (
    <aside className="min-w-0">
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        className="overflow-hidden rounded-lg border border-black/10 bg-background dark:border-white/10"
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-primary-foreground/20">
          <span>
            <span className="block text-sm font-medium text-primary">
              Technical details
            </span>
            <span className="mt-0.5 block text-[11px] text-primary/45">
              IDs and orchestration metadata
            </span>
          </span>
          <ChevronDownIcon
            className={cn(
              "size-4 text-primary/40 transition",
              open && "rotate-180",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Separator className="bg-black/5 dark:bg-white/5" />
          <dl className="space-y-4 p-4 text-xs">
            <TechnicalValue label="Execution ID" value={execution.id} />
            <TechnicalValue label="Workflow ID" value={execution.workflowId} />
            {execution.inngestEventId ? (
              <TechnicalValue
                label="Inngest event ID"
                value={execution.inngestEventId}
              />
            ) : null}
            {execution.completedAt ? (
              <TechnicalValue
                label="Completed at"
                value={format(execution.completedAt, "yyyy-MM-dd HH:mm:ss")}
              />
            ) : null}
          </dl>
        </CollapsibleContent>
      </Collapsible>
    </aside>
  );
}

function TechnicalValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase text-primary/40">
        {label}
      </dt>
      <dd className="mt-1 break-all font-mono text-[11px] leading-5 text-primary/70">
        {value}
      </dd>
    </div>
  );
}
