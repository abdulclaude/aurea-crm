"use client";

import { AlertTriangle, CreditCard, TicketCheck } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDecimalMoney } from "@/features/commerce/lib/money";
import {
  buildBookingOutcomeImpact,
  type BookingOutcome,
  type BookingOutcomePolicy,
} from "@/features/studio/lib/booking-outcome-impact";

export function BookingOutcomeConfirmDialog({
  bookingNames,
  onConfirm,
  onOpenChange,
  open,
  outcome,
  pending,
  policy,
  policyError,
  policyLoading,
}: {
  bookingNames: string[];
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  outcome: BookingOutcome;
  pending: boolean;
  policy: BookingOutcomePolicy | null;
  policyError: string | null;
  policyLoading: boolean;
}) {
  const impact = buildBookingOutcomeImpact({
    bookingCount: bookingNames.length,
    outcome,
    policy,
  });
  const label = outcome === "NO_SHOW" ? "no-show" : "late cancellation";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm {label}</AlertDialogTitle>
          <AlertDialogDescription>
            This updates {bookingNames.length} booking
            {bookingNames.length === 1 ? "" : "s"} and applies the configured
            policy immediately.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">
            {bookingNames.slice(0, 5).map((name, index) => (
              <Badge key={`${name}-${index}`} variant="secondary">
                {name}
              </Badge>
            ))}
            {bookingNames.length > 5 ? (
              <Badge variant="outline">+{bookingNames.length - 5} more</Badge>
            ) : null}
          </div>

          {policyLoading ? (
            <div className="rounded-md border p-3 text-muted-foreground">
              Loading cancellation impact...
            </div>
          ) : policyError ? (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3 text-rose-700 dark:text-rose-300">
              Cancellation impact could not be loaded. {policyError}
            </div>
          ) : policy ? (
            <div className="divide-y rounded-md border">
              <ImpactRow label="Policy" value={policy.name} />
              <ImpactRow
                label="Fee per member"
                value={
                  impact.feeAmount
                    ? formatDecimalMoney(impact.feeAmount, policy.currency)
                    : "No fee"
                }
              />
              <ImpactRow
                label="Maximum total fee"
                value={
                  impact.totalFeeAmount
                    ? formatDecimalMoney(impact.totalFeeAmount, policy.currency)
                    : "No fee"
                }
              />
              <ImpactRow
                label="Maximum credits deducted"
                value={String(impact.creditsDeducted)}
              />
            </div>
          ) : (
            <div className="flex gap-3 rounded-md border p-3 text-muted-foreground">
              <TicketCheck aria-hidden="true" className="mt-0.5 size-4" />
              <p>
                No cancellation policy applies. Only booking status changes.
              </p>
            </div>
          )}

          {impact.automaticCollection ? (
            <div className="flex gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
              <CreditCard aria-hidden="true" className="mt-0.5 size-4" />
              <p>
                Saved-card collection will be queued through this
                workspace&apos;s connected Stripe account.
              </p>
            </div>
          ) : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            variant={outcome === "NO_SHOW" ? "destructive" : "default"}
            disabled={
              pending ||
              policyLoading ||
              Boolean(policyError) ||
              bookingNames.length === 0
            }
            onClick={onConfirm}
          >
            <AlertTriangle aria-hidden="true" />
            {pending ? "Applying..." : `Confirm ${label}`}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ImpactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 p-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
