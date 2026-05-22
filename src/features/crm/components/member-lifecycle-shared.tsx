"use client";

import type React from "react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LifecycleSummary } from "./member-lifecycle-types";
import { funnelSteps, labelize } from "./member-lifecycle-types";

export function LifecycleStrip({ data }: { data: LifecycleSummary }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium text-primary/55">
        Funnel position
      </p>
      <div className="space-y-2">
        {funnelSteps.map(([key, label], index) => {
          const complete = data.funnel[key];
          return (
            <div key={key} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border text-[10px]",
                  complete
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-black/10 bg-black/[0.02] text-primary/35",
                )}
              >
                {index + 1}
              </div>
              <span className="text-xs text-primary/70">{label}</span>
              <Separator className="flex-1 bg-black/5" />
              <Badge variant="outline" className="text-[10px]">
                {complete ? "Done" : "Open"}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Section({
  title,
  children,
  hideSeparator,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  hideSeparator?: boolean;
}) {
  return (
    <section className="space-y-2">
      {hideSeparator ? null : <Separator className="bg-black/5 w-full" />}
      <div className="px-6">
        <p className="text-xs font-medium text-primary/70 pt-1">{title}</p>
        <div className="divide-y divide-black/5">{children}</div>
      </div>
    </section>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-black/5 bg-primary-foreground/35 px-3 py-2">
      <p className="text-[10px] text-primary/45">{label}</p>
      <p className="truncate text-xs font-medium text-primary">{value}</p>
    </div>
  );
}

export function Row({
  title,
  meta,
  status,
  tone,
}: {
  title: string;
  meta: string;
  status: string;
  tone?: "success" | "danger";
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-primary">{title}</p>
        <p className="truncate text-[11px] text-primary/50">{meta}</p>
      </div>
      <Badge
        variant="outline"
        className={cn(
          "text-[10px]",
          tone === "success" && "text-emerald-700",
          tone === "danger" && "text-rose-700",
        )}
      >
        {labelize(status)}
      </Badge>
    </div>
  );
}

export function EmptyLine({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <p className="text-xs text-primary/45">{label}</p>
      <Button variant="ghost" size="sm" className="h-7 text-[11px]" disabled>
        No data
      </Button>
    </div>
  );
}
