"use client";

import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  formatDateValue,
  parseDateValue,
} from "@/components/ui/date-picker-utils";
import type { SavedAudienceDefinition } from "@/features/audiences/lib/audience-definition";

type DateFilterKey = "createdAt" | "lastInteractionAt";

type AudienceDateFieldsProps = {
  definition: SavedAudienceDefinition;
  disabled?: boolean;
  onChange: (definition: SavedAudienceDefinition) => void;
};

export function AudienceDateFields({
  definition,
  disabled = false,
  onChange,
}: AudienceDateFieldsProps) {
  function updateRange(
    key: DateFilterKey,
    range: { from?: Date; to?: Date } | undefined,
  ): void {
    const next = range?.from
      ? {
          from: formatDateValue(range.from),
          to: range.to ? formatDateValue(range.to) : undefined,
        }
      : null;
    onChange({
      ...definition,
      [key]: next,
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(
        [
          ["createdAt", "Created"],
          ["lastInteractionAt", "Last interaction"],
        ] as const
      ).map(([key, label]) => (
        <fieldset key={key} className="space-y-2">
          <legend className="text-xs font-medium text-primary">{label}</legend>
          <DateRangePicker
            value={{
              from: parseDateValue(definition[key]?.from?.slice(0, 10)),
              to: parseDateValue(definition[key]?.to?.slice(0, 10)),
            }}
            onChange={(range) => updateRange(key, range)}
            minDate={new Date(2000, 0, 1)}
            maxDate={new Date()}
            disabled={disabled}
            placeholder={`Pick ${label.toLowerCase()} range`}
            ariaLabel={`${label} date range`}
          />
        </fieldset>
      ))}
    </div>
  );
}
