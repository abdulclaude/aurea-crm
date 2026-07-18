"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PromoCodeTargetSelector } from "./promo-code-target-selector";
import type { PromoCodeRow } from "./types";

type PromoCodeEditDialogProps = {
  open: boolean;
  isPending: boolean;
  promoCode: PromoCodeRow | null;
  onOpenChange: (open: boolean) => void;
  onSave: (input: {
    applicablePricingOptionIds: string[];
    discountType: "PERCENT" | "FIXED";
    discountValue: number;
    expiresAt: string | null;
    id: string;
    isActive: boolean;
    maxRedemptions: number | null;
  }) => void;
};

export function PromoCodeEditDialog({
  open,
  isPending,
  promoCode,
  onOpenChange,
  onSave,
}: PromoCodeEditDialogProps) {
  const [discountType, setDiscountType] = React.useState<"PERCENT" | "FIXED">(
    "PERCENT",
  );
  const [discountValue, setDiscountValue] = React.useState("");
  const [maxRedemptions, setMaxRedemptions] = React.useState("");
  const [expiresAt, setExpiresAt] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [targetMode, setTargetMode] = React.useState<"ALL" | "SELECTED">("ALL");
  const [selectedOptionIds, setSelectedOptionIds] = React.useState<string[]>(
    [],
  );

  React.useEffect(() => {
    if (!promoCode) return;
    setDiscountType(promoCode.discountType);
    setDiscountValue(String(Number(promoCode.discountValue)));
    setMaxRedemptions(promoCode.maxRedemptions?.toString() ?? "");
    setExpiresAt(
      promoCode.expiresAt
        ? new Date(promoCode.expiresAt).toISOString().slice(0, 16)
        : "",
    );
    setIsActive(promoCode.isActive);
    const targetIds = promoCode.applicablePricingOptionIds ?? [];
    setTargetMode(targetIds.length > 0 ? "SELECTED" : "ALL");
    setSelectedOptionIds(targetIds);
  }, [promoCode]);

  if (!promoCode) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {promoCode.code}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Discount type</Label>
              <Select
                value={discountType}
                onValueChange={(value) =>
                  setDiscountType(value as "PERCENT" | "FIXED")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENT">Percent</SelectItem>
                  <SelectItem value="FIXED">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Discount value</Label>
              <Input
                type="number"
                min="0"
                value={discountValue}
                onChange={(event) => setDiscountValue(event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Max uses</Label>
              <Input
                type="number"
                min="1"
                placeholder="Unlimited"
                value={maxRedemptions}
                onChange={(event) => setMaxRedemptions(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Expires</Label>
              <DateTimePicker
                value={expiresAt}
                onChange={setExpiresAt}
                minDate={new Date()}
                dateAriaLabel="Promo code expiry date"
                timeAriaLabel="Promo code expiry time"
                className="sm:grid-cols-1"
              />
            </div>
          </div>
          <PromoCodeTargetSelector
            targetMode={targetMode}
            selectedOptionIds={selectedOptionIds}
            onTargetModeChange={setTargetMode}
            onSelectedOptionIdsChange={setSelectedOptionIds}
          />
          <div className="flex items-center justify-between rounded-sm border border-black/10 p-3 dark:border-white/5">
            <Label>Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              isPending ||
              !discountValue ||
              (targetMode === "SELECTED" && selectedOptionIds.length === 0)
            }
            onClick={() =>
              onSave({
                id: promoCode.id,
                discountType,
                discountValue: Number(discountValue),
                maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
                applicablePricingOptionIds:
                  targetMode === "SELECTED" ? selectedOptionIds : [],
                expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
                isActive,
              })
            }
          >
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
