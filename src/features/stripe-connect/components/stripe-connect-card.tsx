"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { format } from "date-fns";

export function StripeConnectCard() {
  const trpc = useTRPC();
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch connection status
  const {
    data: connection,
    isLoading,
    refetch,
  } = useQuery(trpc.stripeConnect.getConnection.queryOptions());

  // Sync account mutation
  const { mutate: syncAccount, isPending: isSyncing } = useMutation(
    trpc.stripeConnect.syncAccount.mutationOptions({
      onSuccess: () => {
        toast.success("Account synced successfully");
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to sync account");
      },
    })
  );

  // Disconnect mutation
  const { mutate: disconnect, isPending: isDisconnecting } = useMutation(
    trpc.stripeConnect.disconnect.mutationOptions({
      onSuccess: () => {
        toast.success("Stripe account disconnected");
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to disconnect account");
      },
    })
  );

  const handleConnect = () => {
    setIsConnecting(true);
    // Redirect to Stripe Connect OAuth
    // The backend will automatically get org/subaccount from session
    window.location.href = `/api/stripe/connect`;
  };

  const handleSync = () => {
    syncAccount();
  };

  const handleDisconnect = () => {
    if (
      confirm(
        "Are you sure you want to disconnect your Stripe account? This will disable payment processing."
      )
    ) {
      disconnect();
    }
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!connection || !connection.isActive) {
    return (
      <div className="border rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-500"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h3 className=" font-medium">Connect your Stripe account</h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-lg">
              Connect your Stripe account to accept payments for invoices. Your
              customers will be able to pay using credit cards, and funds will
              be deposited directly to your Stripe account.
            </p>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-max"
              variant="gradient"
            >
              {isConnecting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Connect with Stripe"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-500"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
              </svg>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold">Stripe Connected</h3>
              {connection.chargesEnabled && connection.payoutsEnabled ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-yellow-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {connection.businessName ||
                connection.email ||
                "Connected Account"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
          >
            {isDisconnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Unplug className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Account Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Account Type</div>
          <div className="text-sm font-medium capitalize">
            {connection.accountType}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Charges</div>
          <div
            className={`text-sm font-medium ${
              connection.chargesEnabled ? "text-green-600" : "text-red-600"
            }`}
          >
            {connection.chargesEnabled ? "Enabled" : "Disabled"}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Payouts</div>
          <div
            className={`text-sm font-medium ${
              connection.payoutsEnabled ? "text-green-600" : "text-red-600"
            }`}
          >
            {connection.payoutsEnabled ? "Enabled" : "Disabled"}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Details</div>
          <div
            className={`text-sm font-medium ${
              connection.detailsSubmitted ? "text-green-600" : "text-yellow-600"
            }`}
          >
            {connection.detailsSubmitted ? "Complete" : "Incomplete"}
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
        {connection.country && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Country</div>
            <div className="text-sm">{connection.country}</div>
          </div>
        )}
        {connection.currency && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              Default Currency
            </div>
            <div className="text-sm">{connection.currency}</div>
          </div>
        )}
        {connection.lastSyncedAt && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              Last Synced
            </div>
            <div className="text-sm">
              {format(new Date(connection.lastSyncedAt), "MMM dd, yyyy HH:mm")}
            </div>
          </div>
        )}
        <div>
          <div className="text-xs text-muted-foreground mb-1">Account ID</div>
          <div className="text-sm font-mono text-xs">
            {connection.stripeAccountId}
          </div>
        </div>
      </div>

      {/* Warning if not fully set up */}
      {(!connection.chargesEnabled ||
        !connection.payoutsEnabled ||
        !connection.detailsSubmitted) && (
        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-900/40">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Action Required:</strong> Your Stripe account setup is
            incomplete. Please visit your{" "}
            <a
              href={`https://dashboard.stripe.com/${connection.stripeAccountId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              Stripe Dashboard
            </a>{" "}
            to complete the setup and start accepting payments.
          </p>
        </div>
      )}
    </div>
  );
}
