"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, CheckCircle, AlertCircle, Clock, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

function planTypeLabel(type: string): string {
  return type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function intervalLabel(interval: string): string {
  const map: Record<string, string> = {
    WEEKLY: "Weekly",
    MONTHLY: "Monthly",
    QUARTERLY: "Quarterly",
    ANNUALLY: "Annual",
    ONE_TIME: "One-time",
  };
  return map[interval] ?? interval;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    SUCCEEDED: { label: "Paid", variant: "default" },
    PENDING: { label: "Pending", variant: "secondary" },
    FAILED: { label: "Failed", variant: "destructive" },
    REFUNDED: { label: "Refunded", variant: "outline" },
    CANCELLED: { label: "Cancelled", variant: "outline" },
  };
  const config = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function StudioBillingPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [syncingPlanId, setSyncingPlanId] = useState<string | null>(null);

  const plansQuery = useQuery(
    trpc.membershipPlans.list.queryOptions({ includeInactive: true })
  );

  const paymentsQuery = useQuery(
    trpc.studioBilling.getPayments.queryOptions({ limit: 20 })
  );

  const syncMutation = useMutation(
    trpc.studioBilling.syncPlanWithStripe.mutationOptions({
      onSuccess: () => {
        toast.success("Plan synced with Stripe");
        queryClient.invalidateQueries({ queryKey: trpc.membershipPlans.list.queryOptions({}).queryKey });
        setSyncingPlanId(null);
      },
      onError: (err) => {
        toast.error(err.message);
        setSyncingPlanId(null);
      },
    })
  );

  const handleSync = (planId: string) => {
    setSyncingPlanId(planId);
    syncMutation.mutate({ planId });
  };

  return (
    <div className="container mx-auto py-8 px-6 max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Membership Billing</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Sync membership plans with Stripe and view payment history
        </p>
      </div>

      {/* Plans — Stripe sync status */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Membership Plans</h2>
          <p className="text-xs text-muted-foreground">
            Each plan must be synced before accepting online payments
          </p>
        </div>

        {plansQuery.isLoading ? (
          <p className="text-sm text-muted-foreground py-4">Loading plans…</p>
        ) : plansQuery.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No membership plans found.</p>
        ) : (
          <div className="space-y-3">
            {plansQuery.data?.map((plan) => {
              const isSynced = Boolean(plan.stripeProductId && plan.stripePriceId);
              const isSyncing = syncingPlanId === plan.id;

              return (
                <div
                  key={plan.id}
                  className="flex items-center justify-between rounded-md border border-white/5 bg-background/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {isSynced ? (
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{plan.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {planTypeLabel(plan.type)} · {intervalLabel(plan.billingInterval)} ·{" "}
                        £{Number(plan.price).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSynced ? (
                      <Badge variant="outline" className="text-green-500 border-green-500/30 text-xs">
                        Synced
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">
                        Not synced
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSync(plan.id)}
                      disabled={isSyncing}
                    >
                      <RefreshCw className={`h-3 w-3 mr-1.5 ${isSyncing ? "animate-spin" : ""}`} />
                      {isSynced ? "Re-sync" : "Sync"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Payment History */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Payment History</h2>
        </div>

        {paymentsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground py-4">Loading payments…</p>
        ) : !paymentsQuery.data?.payments.length ? (
          <p className="text-sm text-muted-foreground py-4">No payments recorded yet.</p>
        ) : (
          <div className="space-y-0">
            {paymentsQuery.data.payments.map((payment, index) => (
              <div key={payment.id}>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">
                      {payment.client?.name ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.description ?? payment.type} ·{" "}
                      {format(new Date(payment.createdAt), "d MMM yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {statusBadge(payment.status)}
                    <span className="text-sm font-semibold tabular-nums">
                      £{Number(payment.amount).toFixed(2)}
                    </span>
                  </div>
                </div>
                {index < paymentsQuery.data.payments.length - 1 && (
                  <Separator className="opacity-30" />
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
