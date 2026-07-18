"use client";

import { Plus } from "lucide-react";
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
import { PromoCodeTargetSelector } from "./promo-code-target-selector";

type CreatePromoInput = {
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  maxRedemptions?: number;
  applicablePricingOptionIds?: string[];
  expiresAt?: string;
};

type PromoCodeDialogProps = {
  open: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreatePromoInput) => void;
};

export function PromoCodeDialog({
  open,
  isPending,
  onOpenChange,
  onCreate,
}: PromoCodeDialogProps) {
  const [code, setCode] = React.useState("");
  const [discountType, setDiscountType] = React.useState<"PERCENT" | "FIXED">(
    "PERCENT",
  );
  const [discountValue, setDiscountValue] = React.useState("10");
  const [maxRedemptions, setMaxRedemptions] = React.useState("");
  const [expiresAt, setExpiresAt] = React.useState("");
  const [targetMode, setTargetMode] = React.useState<"ALL" | "SELECTED">("ALL");
  const [selectedOptionIds, setSelectedOptionIds] = React.useState<string[]>(
    [],
  );

  React.useEffect(() => {
    if (!open) reset();
  }, [open]);

  function reset(): void {
    setCode("");
    setDiscountType("PERCENT");
    setDiscountValue("10");
    setMaxRedemptions("");
    setExpiresAt("");
    setTargetMode("ALL");
    setSelectedOptionIds([]);
  }

  function handleCreate(): void {
    onCreate({
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
      applicablePricingOptionIds:
        targetMode === "SELECTED" ? selectedOptionIds : undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    });
  }

  const discountAmount = Number(discountValue);
  const canCreate =
    code.trim().length > 0 &&
    Number.isFinite(discountAmount) &&
    discountAmount > 0 &&
    (targetMode === "ALL" || selectedOptionIds.length > 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create promo code</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="SUMMER20"
              />
            </div>
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
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>{discountType === "PERCENT" ? "Percent" : "Amount"}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={discountValue}
                onChange={(event) => setDiscountValue(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Max uses</Label>
              <Input
                type="number"
                min="1"
                value={maxRedemptions}
                onChange={(event) => setMaxRedemptions(event.target.value)}
                placeholder="Unlimited"
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isPending || !canCreate}>
            <Plus className="size-3.5" />
            {isPending ? "Creating..." : "Create code"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
