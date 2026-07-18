import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  Unplug,
  XCircle,
} from "lucide-react";
import type { JSX } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { AppRouter } from "@/trpc/routers/_app";

import { StripeConnectLogo } from "./stripe-connect-logo";

type StripeConnection = NonNullable<
  inferRouterOutputs<AppRouter>["stripeConnect"]["getConnection"]
>;

function StatusValue({ enabled }: { enabled: boolean }): JSX.Element {
  return (
    <p
      className={
        enabled
          ? "text-sm font-medium text-green-600"
          : "text-sm font-medium text-red-600"
      }
    >
      {enabled ? "Enabled" : "Disabled"}
    </p>
  );
}

export function StripeConnectConnectionState({
  connection,
  isDisconnecting,
  isSyncing,
  onDisconnect,
  onSync,
}: {
  connection: StripeConnection;
  isDisconnecting: boolean;
  isSyncing: boolean;
  onDisconnect: () => void;
  onSync: () => void;
}): JSX.Element {
  const ready = connection.chargesEnabled && connection.payoutsEnabled;

  return (
    <div className="rounded-lg border p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <StripeConnectLogo className="bg-green-500/10 text-green-500" />
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-lg font-semibold">Stripe connected</h3>
              {ready ? (
                <CheckCircle2 className="size-5 text-green-500" />
              ) : (
                <XCircle className="size-5 text-yellow-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {connection.businessName ||
                connection.email ||
                "Connected account"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onSync}
            disabled={isSyncing}
            aria-label="Sync Stripe account"
            title="Sync Stripe account"
          >
            {isSyncing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={isDisconnecting}
                aria-label="Disconnect Stripe account"
                title="Disconnect Stripe account"
              >
                {isDisconnecting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Unplug />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect Stripe?</AlertDialogTitle>
                <AlertDialogDescription>
                  New payment processing will stop for this workspace. The
                  connected Express account and financial history will remain
                  intact.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDisconnect}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Account type</p>
          <p className="text-sm font-medium capitalize">
            {connection.accountType}
          </p>
        </div>
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Charges</p>
          <StatusValue enabled={connection.chargesEnabled} />
        </div>
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Payouts</p>
          <StatusValue enabled={connection.payoutsEnabled} />
        </div>
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Details</p>
          <StatusValue enabled={connection.detailsSubmitted} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 border-t pt-4 text-xs md:grid-cols-2">
        {connection.country ? (
          <div>
            <p className="mb-1 text-muted-foreground">Country</p>
            <p className="text-sm">{connection.country}</p>
          </div>
        ) : null}
        {connection.currency ? (
          <div>
            <p className="mb-1 text-muted-foreground">Default currency</p>
            <p className="text-sm">{connection.currency}</p>
          </div>
        ) : null}
        {connection.lastSyncedAt ? (
          <div>
            <p className="mb-1 text-muted-foreground">Last synced</p>
            <p className="text-sm">
              {format(new Date(connection.lastSyncedAt), "MMM dd, yyyy HH:mm")}
            </p>
          </div>
        ) : null}
        <div>
          <p className="mb-1 text-muted-foreground">Account ID</p>
          <p className="break-all font-mono">{connection.stripeAccountId}</p>
        </div>
      </div>

      {!connection.chargesEnabled ||
      !connection.payoutsEnabled ||
      !connection.detailsSubmitted ? (
        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-900/40 dark:bg-yellow-900/20 dark:text-yellow-200">
          Account setup is incomplete. Complete the remaining requirements in
          your Stripe Dashboard before accepting payments.
        </div>
      ) : null}
    </div>
  );
}
