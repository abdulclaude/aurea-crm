"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { formatDecimalMoney } from "@/features/commerce/lib/money";

type MembershipOption = {
  id: string;
  name: string;
  price: string;
  currency: string;
};

export function MembershipOptionList({
  options,
  selectedIds,
  loading,
  onToggle,
  emptyMessage = "No public membership options found.",
}: {
  options: MembershipOption[];
  selectedIds: string[];
  loading: boolean;
  onToggle: (id: string, selected: boolean) => void;
  emptyMessage?: string;
}) {
  return (
    <div className="max-h-44 space-y-2 overflow-y-auto border-y py-2">
      {options.map((option) => (
        <label
          key={option.id}
          className="flex cursor-pointer items-center gap-2 text-sm"
        >
          <Checkbox
            checked={selectedIds.includes(option.id)}
            onCheckedChange={(next) => onToggle(option.id, next === true)}
          />
          <span className="min-w-0 flex-1 truncate">{option.name}</span>
          <span className="text-xs text-muted-foreground">
            {formatDecimalMoney(option.price, option.currency)}
          </span>
        </label>
      ))}
      {!loading && options.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyMessage}</p>
      ) : null}
    </div>
  );
}
