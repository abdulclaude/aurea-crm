import type { ReactElement } from "react";

import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@/db/enums";

const STATUS_DETAILS = {
  DRAFT: { label: "Draft", color: "#6b7280" },
  SENT: { label: "Sent", color: "#3b82f6" },
  VIEWED: { label: "Viewed", color: "#a855f7" },
  PAID: { label: "Paid", color: "#22c55e" },
  PARTIALLY_PAID: { label: "Partial", color: "#eab308" },
  OVERDUE: { label: "Overdue", color: "#ef4444" },
  CANCELLED: { label: "Cancelled", color: "#6b7280" },
} satisfies Record<InvoiceStatus, { label: string; color: string }>;

type InvoiceStatusBadgeProps = {
  status: InvoiceStatus;
  label?: string;
};

export function InvoiceStatusBadge({
  status,
  label,
}: InvoiceStatusBadgeProps): ReactElement {
  const details = STATUS_DETAILS[status];

  return (
    <Badge
      variant="outline"
      className="max-w-44 truncate text-[10px] ring-0"
      style={{
        backgroundColor: `${details.color}18`,
        borderColor: `${details.color}66`,
        color: details.color,
        boxShadow: `0 0 0 1px ${details.color}66`,
      }}
    >
      {label ?? details.label}
    </Badge>
  );
}
