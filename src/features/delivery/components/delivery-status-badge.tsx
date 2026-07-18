import { Badge } from "@/components/ui/badge";
import type { JSX } from "react";
import type { OutboundDeliveryStatus } from "@/features/delivery/contracts";
import { cn } from "@/lib/utils";

const STATUS_CLASSES = {
  QUEUED: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  SENDING:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  ACCEPTED:
    "border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  DELIVERED:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  BOUNCED: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  SUPPRESSED:
    "border-zinc-500/25 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
  CANCELLED:
    "border-zinc-500/25 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
  DEAD_LETTER: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
  UNKNOWN:
    "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300",
} as const satisfies Record<OutboundDeliveryStatus, string>;

export function DeliveryStatusBadge({
  status,
}: {
  status: OutboundDeliveryStatus;
}): JSX.Element {
  return (
    <Badge
      variant="outline"
      className={cn("font-normal", STATUS_CLASSES[status])}
    >
      {status.toLowerCase().replaceAll("_", " ")}
    </Badge>
  );
}
