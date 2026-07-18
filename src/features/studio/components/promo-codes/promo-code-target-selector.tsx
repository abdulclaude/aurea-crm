"use client";

import { useQuery } from "@tanstack/react-query";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTRPC } from "@/trpc/client";

type PromoCodeTargetSelectorProps = {
  targetMode: "ALL" | "SELECTED";
  selectedOptionIds: string[];
  onTargetModeChange: (value: "ALL" | "SELECTED") => void;
  onSelectedOptionIdsChange: (value: string[]) => void;
};

export function PromoCodeTargetSelector({
  targetMode,
  selectedOptionIds,
  onTargetModeChange,
  onSelectedOptionIdsChange,
}: PromoCodeTargetSelectorProps) {
  const trpc = useTRPC();
  const pricingOptions = useQuery(
    trpc.pricingOptions.list.queryOptions({ includeInactive: false }),
  );

  function toggleOption(optionId: string, checked: boolean): void {
    onSelectedOptionIdsChange(
      checked
        ? [...selectedOptionIds, optionId]
        : selectedOptionIds.filter((id) => id !== optionId),
    );
  }

  const options = pricingOptions.data ?? [];

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Applies to</Label>
        <Select value={targetMode} onValueChange={onTargetModeChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All pricing options</SelectItem>
            <SelectItem value="SELECTED">Selected pricing options</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {targetMode === "SELECTED" && (
        <div className="max-h-52 space-y-2 overflow-y-auto rounded-sm border border-black/10 p-3 dark:border-white/5">
          {options.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-start gap-3 rounded-sm p-2 hover:bg-primary/5"
            >
              <Checkbox
                checked={selectedOptionIds.includes(option.id)}
                onCheckedChange={(checked) =>
                  toggleOption(option.id, checked === true)
                }
              />
              <span className="min-w-0">
                <span className="block text-xs font-medium text-primary">
                  {option.name}
                </span>
                <span className="block text-[11px] text-primary/50">
                  {option.type.toLowerCase().replaceAll("_", " ")}
                </span>
              </span>
            </label>
          ))}
          {options.length === 0 && (
            <p className="text-xs text-primary/50">
              Create pricing options before restricting promo codes.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
