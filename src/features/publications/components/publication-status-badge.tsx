import {
  CircleCheck,
  CirclePause,
  FilePenLine,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { PublicationTargetSummary } from "@/features/publications/components/publication-ui-types";

type PublicationStatus = PublicationTargetSummary["status"];

const STATUS_DETAILS: Record<
  PublicationStatus,
  { label: string; className: string; icon: typeof CircleCheck }
> = {
  DRAFT: {
    label: "Draft",
    className: "bg-muted text-muted-foreground",
    icon: FilePenLine,
  },
  PUBLISHED: {
    label: "Published",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    icon: CircleCheck,
  },
  PAUSED: {
    label: "Paused",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    icon: CirclePause,
  },
  ARCHIVED: {
    label: "Archived",
    className: "bg-destructive/10 text-destructive",
    icon: ShieldAlert,
  },
};

export function PublicationStatusBadge({
  status,
}: {
  status: PublicationStatus;
}): React.JSX.Element {
  const details = STATUS_DETAILS[status];
  const Icon = details.icon;
  return (
    <Badge variant="secondary" className={details.className}>
      <Icon aria-hidden="true" />
      {details.label}
    </Badge>
  );
}
