import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function ExecutionMetric({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone?: "neutral" | "sky" | "emerald" | "rose";
}) {
  return (
    <div className="flex min-h-24 items-center gap-3 border-r border-black/5 px-4 py-4 last:border-r-0 dark:border-white/5 md:px-6">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg border",
          tone === "neutral" &&
            "border-black/10 bg-background text-primary/60 dark:border-white/10",
          tone === "sky" &&
            "border-sky-500/15 bg-sky-500/10 text-sky-600 dark:text-sky-300",
          tone === "emerald" &&
            "border-emerald-500/15 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
          tone === "rose" &&
            "border-rose-500/15 bg-rose-500/10 text-rose-600 dark:text-rose-300",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-semibold tabular-nums text-primary">
          {value}
        </span>
        <span className="block truncate text-[11px] text-primary/45">
          {label}
        </span>
      </span>
    </div>
  );
}
