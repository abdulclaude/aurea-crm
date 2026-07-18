import { Badge } from "@/components/ui/badge";

import type { CancellationChargeStatus } from "./types";

export const CANCELLATION_CHARGE_STATUS_OPTIONS: Array<{
  value: CancellationChargeStatus | "ALL";
  label: string;
}> = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "REQUIRES_PAYMENT_METHOD", label: "Payment method required" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SUCCEEDED", label: "Paid" },
  { value: "FAILED", label: "Failed" },
  { value: "NO_PAYMENT_DUE", label: "No payment due" },
  { value: "WAIVED", label: "Waived" },
  { value: "PARTIALLY_REFUNDED", label: "Partially refunded" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "DISPUTED", label: "Disputed" },
];

export function ChargeStatusBadge({
  status,
}: {
  status: CancellationChargeStatus;
}) {
  const label =
    CANCELLATION_CHARGE_STATUS_OPTIONS.find((option) => option.value === status)
      ?.label ?? status;
  const variant =
    status === "FAILED" || status === "REQUIRES_PAYMENT_METHOD"
      ? ("destructive" as const)
      : status === "SUCCEEDED"
        ? ("default" as const)
        : ("secondary" as const);
  return <Badge variant={variant}>{label}</Badge>;
}
