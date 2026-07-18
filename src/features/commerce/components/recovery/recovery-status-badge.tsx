import { Badge } from "@/components/ui/badge";
import type { recoveryCaseStatuses } from "@/features/commerce/recovery-contracts";
import { cn } from "@/lib/utils";

export type RecoveryCaseStatus = (typeof recoveryCaseStatuses)[number];

const STATUS_STYLES: Record<RecoveryCaseStatus, string> = {
  OPEN: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  IN_PROGRESS: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  RECOVERED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  EXHAUSTED: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  CANCELLED: "bg-muted text-muted-foreground",
};

export function RecoveryStatusBadge({
  status,
}: {
  status: RecoveryCaseStatus;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", STATUS_STYLES[status])}
    >
      {status.replaceAll("_", " ").toLowerCase()}
    </Badge>
  );
}
