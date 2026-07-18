import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CANCELLATION_CHARGE_STATUS_OPTIONS } from "./charge-status";
import type { CancellationChargeStatus } from "./types";

export function ChargesFilterToolbar({
  onStatusChange,
  status,
}: {
  onStatusChange: (value: CancellationChargeStatus | "ALL") => void;
  status: CancellationChargeStatus | "ALL";
}) {
  return (
    <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div>
        <h2 className="text-sm font-semibold">Fee operations</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Review credit deductions, payment attempts, failures, and waivers.
        </p>
      </div>
      <Select
        value={status}
        onValueChange={(value) =>
          onStatusChange(value as CancellationChargeStatus | "ALL")
        }
      >
        <SelectTrigger
          aria-label="Filter cancellation fees by status"
          className="w-full sm:w-56"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CANCELLATION_CHARGE_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
