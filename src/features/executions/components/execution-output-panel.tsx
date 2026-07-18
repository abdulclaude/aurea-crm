"use client";

import {
  AlertTriangleIcon,
  BracesIcon,
  ChevronDownIcon,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ExecutionStatus } from "@/db/enums";
import { cn } from "@/lib/utils";
import type { ExecutionDetail } from "./execution-detail-types";

export function ExecutionOutputPanel({
  execution,
}: {
  execution: ExecutionDetail;
}) {
  const [showStackTrace, setShowStackTrace] = useState(false);

  return (
    <div className="min-w-0 space-y-5">
      {execution.error ? (
        <section className="overflow-hidden rounded-lg border border-rose-500/20 bg-rose-500/5">
          <div className="flex items-start gap-3 p-4 md:p-5">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-300" />
            <div className="min-w-0">
              <h2 className="text-sm font-medium text-rose-800 dark:text-rose-200">
                Execution error
              </h2>
              <p className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-rose-700 dark:text-rose-300">
                {execution.error}
              </p>
            </div>
          </div>
          {execution.errorStack ? (
            <Collapsible open={showStackTrace} onOpenChange={setShowStackTrace}>
              <Separator className="bg-rose-500/15" />
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="m-3 w-max rounded-lg bg-transparent text-rose-700 hover:bg-rose-500/10 hover:text-rose-800 dark:text-rose-300"
                >
                  <ChevronDownIcon
                    className={cn(
                      "size-3.5 transition",
                      showStackTrace && "rotate-180",
                    )}
                  />
                  {showStackTrace ? "Hide stack trace" : "Show stack trace"}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="max-h-96 overflow-auto border-t border-rose-500/15 bg-black/[0.03] p-4 font-mono text-[11px] leading-5 text-rose-800 dark:bg-black/15 dark:text-rose-200">
                  {execution.errorStack}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          ) : null}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-black/10 bg-background dark:border-white/10">
        <div className="flex items-center gap-2 px-4 py-3.5 md:px-5">
          <BracesIcon className="size-4 text-primary/50" />
          <div>
            <h2 className="text-sm font-medium text-primary">Output</h2>
            <p className="text-[11px] text-primary/45">Final workflow context</p>
          </div>
        </div>
        <Separator className="bg-black/5 dark:bg-white/5" />
        {execution.output ? (
          <pre className="max-h-[560px] overflow-auto bg-black/[0.02] p-4 font-mono text-[11px] leading-5 text-primary/75 dark:bg-black/10 md:p-5">
            {JSON.stringify(execution.output, null, 2)}
          </pre>
        ) : (
          <div className="px-5 py-10 text-center text-xs text-primary/45">
            {execution.status === ExecutionStatus.RUNNING
              ? "Output will appear when the workflow completes."
              : "This execution did not return output."}
          </div>
        )}
      </section>
    </div>
  );
}
