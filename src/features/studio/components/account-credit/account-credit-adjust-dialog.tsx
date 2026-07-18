"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";

type AccountCreditAdjustDialogProps = {
  open: boolean;
  isPending: boolean;
  clientName: string;
  onOpenChange: (open: boolean) => void;
  onAdjust: (input: {
    amountPence: number;
    direction: "CREDIT" | "DEBIT";
    reason: string;
  }) => void;
};

function poundsToPence(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function AccountCreditAdjustDialog({
  open,
  isPending,
  clientName,
  onOpenChange,
  onAdjust,
}: AccountCreditAdjustDialogProps) {
  const [direction, setDirection] = React.useState<"CREDIT" | "DEBIT">("CREDIT");
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");
  const amountPence = poundsToPence(amount);

  React.useEffect(() => {
    if (!open) {
      setDirection("CREDIT");
      setAmount("");
      setReason("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust account credit</DialogTitle>
          <DialogDescription>
            Add or remove credit for {clientName}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Select
                value={direction}
                onValueChange={(value) => setDirection(value as "CREDIT" | "DEBIT")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CREDIT">Credit</SelectItem>
                  <SelectItem value="DEBIT">Debit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                inputMode="decimal"
                min="0"
                placeholder="25.00"
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea
              value={reason}
              placeholder="Compensation, correction, refund, or import clean-up..."
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={isPending || amountPence <= 0 || !reason.trim()}
            onClick={() =>
              onAdjust({
                amountPence,
                direction,
                reason,
              })
            }
          >
            {isPending ? "Saving..." : "Save adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
