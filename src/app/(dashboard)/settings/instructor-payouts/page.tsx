"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

function payoutStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    PAID: { label: "Paid", variant: "default" },
    PROCESSING: { label: "Processing", variant: "secondary" },
    PENDING: { label: "Pending", variant: "outline" },
    FAILED: { label: "Failed", variant: "destructive" },
    CANCELLED: { label: "Cancelled", variant: "outline" },
  };
  const config = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function InstructorPayoutsPage() {
  const trpc = useTRPC();
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const instructorsQuery = useQuery(
    trpc.instructors.list.queryOptions({})
  );

  const payoutsQuery = useQuery(
    trpc.instructorConnect.getPayoutHistory.queryOptions({ limit: 30 })
  );

  const onboardingMutation = useMutation(
    trpc.instructorConnect.createOnboardingLink.mutationOptions({
      onSuccess: (data) => {
        window.open(data.url, "_blank");
        setConnectingId(null);
      },
      onError: (err) => {
        toast.error(err.message);
        setConnectingId(null);
      },
    })
  );

  const dashboardMutation = useMutation(
    trpc.instructorConnect.createDashboardLink.mutationOptions({
      onSuccess: (data) => window.open(data.url, "_blank", "noopener,noreferrer"),
      onError: (error) => toast.error(error.message),
    }),
  );

  const handleConnectStripe = (instructorId: string) => {
    setConnectingId(instructorId);
    onboardingMutation.mutate({ instructorId });
  };

  const instructors = instructorsQuery.data?.items ?? [];

  return (
    <div className="container mx-auto py-8 px-6 max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Instructor Payouts</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Connect instructors to Stripe Express and manage earnings transfers
        </p>
      </div>

      {/* Instructor Stripe Connect Status */}
      <Card className="p-6">
        <h2 className="text-base font-semibold mb-4">Instructors</h2>

        {instructorsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground py-4">Loading instructors…</p>
        ) : instructors.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No instructors found.</p>
        ) : (
          <div className="space-y-3">
            {instructors.map((instructor) => {
              const isConnected = instructor.stripeOnboardingComplete;
              const isPending = instructor.stripeAccountId && !instructor.stripeOnboardingComplete;
              const isConnecting = connectingId === instructor.id;

              return (
                <div
                  key={instructor.id}
                  className="flex items-center justify-between rounded-md border border-white/5 bg-background/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {isConnected ? (
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{instructor.name}</p>
                      <p className="text-xs text-muted-foreground">{instructor.email ?? "No email"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <Badge variant="outline" className="text-green-500 border-green-500/30 text-xs">
                        Connected
                      </Badge>
                    ) : isPending ? (
                      <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">
                        Pending
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground text-xs">
                        Not connected
                      </Badge>
                    )}

                    {isConnected ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          dashboardMutation.mutate({ instructorId: instructor.id })
                        }
                        disabled={dashboardMutation.isPending}
                      >
                        <ExternalLink className="h-3 w-3 mr-1.5" />
                        Stripe dashboard
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConnectStripe(instructor.id)}
                        disabled={isConnecting}
                      >
                        <ExternalLink className="h-3 w-3 mr-1.5" />
                        {isPending ? "Continue setup" : "Connect Stripe"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Payout History */}
      <Card className="p-6">
        <h2 className="text-base font-semibold mb-4">Payout History</h2>

        {payoutsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground py-4">Loading payouts…</p>
        ) : !payoutsQuery.data?.payouts.length ? (
          <p className="text-sm text-muted-foreground py-4">No payouts sent yet.</p>
        ) : (
          <div className="space-y-0">
            {payoutsQuery.data.payouts.map((payout, index) => (
              <div key={payout.id}>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{payout.instructor.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(payout.periodStart), "d MMM")} –{" "}
                      {format(new Date(payout.periodEnd), "d MMM yyyy")}
                      {payout.classesCount > 0 && ` · ${payout.classesCount} classes`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {payoutStatusBadge(payout.status)}
                    <span className="text-sm font-semibold tabular-nums">
                      £{Number(payout.amount).toFixed(2)}
                    </span>
                  </div>
                </div>
                {index < payoutsQuery.data.payouts.length - 1 && (
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
