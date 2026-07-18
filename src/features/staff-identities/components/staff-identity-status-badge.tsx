import { Badge } from "@/components/ui/badge";
import type { StaffIdentityStatus } from "@/features/staff-identities/contracts";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<StaffIdentityStatus, string> = {
  ACTIVE:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  INVITED:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  SUSPENDED:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
  ARCHIVED: "border-border bg-muted text-muted-foreground",
};

export function StaffIdentityStatusBadge({
  status,
}: {
  status: StaffIdentityStatus;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-medium", STATUS_STYLES[status])}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}
