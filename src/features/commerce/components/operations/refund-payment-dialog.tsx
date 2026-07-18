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
import {
  decimalToMinorUnits,
  formatMinorUnits,
  minorUnitsToDecimal,
} from "@/features/commerce/lib/money";
import {
  type StripeRefundReason,
  stripeRefundReasonSchema,
} from "@/features/commerce/refund-contracts";
import type { LedgerEntryListItem } from "@/features/commerce/reconciliation-output-contracts";

type RefundSubmission = {
  amountMinor: number;
  reason: StripeRefundReason;
};

export function RefundPaymentDialog({
  entry,
  isPending,
  onOpenChange,
  onSubmit,
}: {
  entry: LedgerEntryListItem | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (submission: RefundSubmission) => void;
}) {
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState<StripeRefundReason>(
    "requested_by_customer",
  );

  React.useEffect(() => {
    if (!entry) return;
    setAmount(
      minorUnitsToDecimal(entry.refundableMinor, entry.currencyExponent),
    );
    setReason("requested_by_customer");
  }, [entry]);

  const parsedAmount = React.useMemo(() => {
    if (!entry) return null;
    try {
      return decimalToMinorUnits(amount, entry.currencyExponent);
    } catch {
      return null;
    }
  }, [amount, entry]);
  const amountValid = Boolean(
    entry &&
      parsedAmount &&
      parsedAmount > 0 &&
      parsedAmount <= entry.refundableMinor,
  );

  return (
    <Dialog open={Boolean(entry)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Refund payment</DialogTitle>
          <DialogDescription>
            The refund is sent through Stripe and recorded in the payment
            ledger. This action cannot be undone in Aurea.
          </DialogDescription>
        </DialogHeader>
        {entry && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (parsedAmount && amountValid) {
                onSubmit({ amountMinor: parsedAmount, reason });
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="refund-amount">Amount</Label>
              <Input
                id="refund-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                aria-invalid={amount.length > 0 && !amountValid}
              />
              <p className="text-xs text-muted-foreground">
                Available: {formatMinorUnits(
                  entry.refundableMinor,
                  entry.currency,
                  entry.currencyExponent,
                )}
              </p>
              {amount.length > 0 && !amountValid && (
                <p className="text-xs text-destructive" role="alert">
                  Enter an amount greater than zero and no more than the
                  available balance.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-reason">Reason</Label>
              <Select
                value={reason}
                onValueChange={(value) => {
                  const parsed = stripeRefundReasonSchema.safeParse(value);
                  if (parsed.success) setReason(parsed.data);
                }}
              >
                <SelectTrigger id="refund-reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requested_by_customer">
                    Requested by customer
                  </SelectItem>
                  <SelectItem value="duplicate">Duplicate payment</SelectItem>
                  <SelectItem value="fraudulent">Fraudulent payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!amountValid || isPending}>
                {isPending ? "Refunding..." : "Refund payment"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
