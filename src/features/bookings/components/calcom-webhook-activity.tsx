"use client";

import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";

type Receipt = {
  id: string;
  triggerEvent: string;
  status: "PROCESSED" | "IGNORED";
  outcome: string;
  receivedAt: Date | string;
  workflowDispatchError: string | null;
};

export function CalComWebhookActivity(props: { receipts: Receipt[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-medium">Webhook activity</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Verified deliveries for the active location.
        </p>
      </div>
      {props.receipts.length === 0 ? (
        <p className="text-xs text-muted-foreground">No deliveries received.</p>
      ) : (
        <div className="divide-y rounded-md border">
          {props.receipts.map((receipt) => (
            <div
              key={receipt.id}
              className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">{eventLabel(receipt.triggerEvent)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {receipt.outcome.replaceAll("_", " ").toLowerCase()} ·{" "}
                  {formatDistanceToNow(new Date(receipt.receivedAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              <Badge
                variant={receipt.status === "PROCESSED" ? "secondary" : "outline"}
              >
                {receipt.workflowDispatchError ? "Workflow error" : receipt.status.toLowerCase()}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function eventLabel(value: string): string {
  return value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) =>
    letter.toUpperCase(),
  );
}
