import type { inferRouterOutputs } from "@trpc/server";
import type { JSX } from "react";

import type { AppRouter } from "@/trpc/routers/_app";

type Summary = inferRouterOutputs<AppRouter>["deliveryOperations"]["summary"];

const SUMMARY_ITEMS = [
  ["queued", "Queued"],
  ["inFlight", "Sending"],
  ["accepted", "Accepted"],
  ["delivered", "Delivered"],
  ["failed", "Failed"],
  ["suppressed", "Suppressed / bounced"],
  ["unknown", "Needs review"],
] as const;

export function DeliverySummaryStrip({
  summary,
}: {
  summary: Summary;
}): JSX.Element {
  return (
    <div className="grid grid-cols-2 border-b border-black/5 sm:grid-cols-4 xl:grid-cols-7 dark:border-white/5">
      {SUMMARY_ITEMS.map(([key, label], index) => (
        <div
          key={key}
          className={`px-5 py-4 ${index > 0 ? "border-l border-black/5 dark:border-white/5" : ""}`}
        >
          <p className="text-lg font-semibold tabular-nums">
            {summary[key].toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}
