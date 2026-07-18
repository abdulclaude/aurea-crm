"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { JSX } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";

import { StripeConnectConnectionState } from "./stripe-connect-connection-state";
import { StripeConnectLogo } from "./stripe-connect-logo";
import { StripeConnectMigrationRequired } from "./stripe-connect-migration-required";

export function StripeConnectCard(): JSX.Element {
  const trpc = useTRPC();
  const connectionQuery = useQuery(
    trpc.stripeConnect.getConnection.queryOptions(),
  );
  const syncMutation = useMutation(
    trpc.stripeConnect.syncAccount.mutationOptions({
      onSuccess: () => {
        toast.success("Account synced successfully");
        void connectionQuery.refetch();
      },
      onError: (error) =>
        toast.error(error.message || "Failed to sync account"),
    }),
  );
  const disconnectMutation = useMutation(
    trpc.stripeConnect.disconnect.mutationOptions({
      onSuccess: () => {
        toast.success("Stripe account disconnected");
        void connectionQuery.refetch();
      },
      onError: (error) =>
        toast.error(error.message || "Failed to disconnect account"),
    }),
  );
  const onboardingMutation = useMutation(
    trpc.stripeConnect.createOnboardingLink.mutationOptions({
      onSuccess: ({ url }) => window.location.assign(url),
      onError: (error) =>
        toast.error(error.message || "Failed to start Stripe onboarding"),
    }),
  );

  if (connectionQuery.isLoading) {
    return (
      <div className="flex justify-center rounded-lg border p-6">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const connection = connectionQuery.data;
  if (connection && connection.accountType !== "express") {
    return (
      <StripeConnectMigrationRequired
        connection={connection}
        isSyncing={syncMutation.isPending}
        onSync={() => syncMutation.mutate()}
      />
    );
  }

  if (!connection || !connection.isActive) {
    return (
      <div className="rounded-lg border p-6">
        <div className="flex items-start gap-4">
          <StripeConnectLogo />
          <div className="min-w-0 flex-1">
            <h3 className="font-medium">Connect your Stripe account</h3>
            <p className="mb-4 mt-1 max-w-lg text-xs text-muted-foreground">
              Connect an Express account to accept destination-charge payments.
              Funds are deposited directly to your Stripe account.
            </p>
            <Button
              onClick={() => onboardingMutation.mutate({})}
              disabled={onboardingMutation.isPending}
              variant="gradient"
            >
              {onboardingMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Set up Stripe payouts"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <StripeConnectConnectionState
      connection={connection}
      isDisconnecting={disconnectMutation.isPending}
      isSyncing={syncMutation.isPending}
      onDisconnect={() => disconnectMutation.mutate()}
      onSync={() => syncMutation.mutate()}
    />
  );
}
