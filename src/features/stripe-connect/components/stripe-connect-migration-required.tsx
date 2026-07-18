import type { inferRouterOutputs } from "@trpc/server";
import { AlertTriangle, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import type { JSX } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { AppRouter } from "@/trpc/routers/_app";

import { StripeConnectLogo } from "./stripe-connect-logo";

type StripeConnection = NonNullable<
  inferRouterOutputs<AppRouter>["stripeConnect"]["getConnection"]
>;

export function StripeConnectMigrationRequired({
  connection,
  isSyncing,
  onSync,
}: {
  connection: StripeConnection;
  isSyncing: boolean;
  onSync: () => void;
}): JSX.Element {
  return (
    <div className="rounded-lg border p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <StripeConnectLogo className="bg-amber-500/10 text-amber-600 dark:text-amber-300" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-medium">Stripe migration required</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {connection.businessName ||
                  connection.email ||
                  "Connected account"}
              </p>
            </div>
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
          </div>
          <Alert className="mt-4 border-amber-500/25 bg-amber-500/5">
            <AlertTriangle />
            <AlertTitle>New payments are disabled</AlertTitle>
            <AlertDescription>
              Aurea uses Stripe Express destination charges. This{" "}
              {connection.accountType} account cannot be reused for that flow.
              It must be replaced through a controlled account migration before
              new checkouts can be enabled.
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="font-mono">{connection.stripeAccountId}</span>
            <a
              href={`https://dashboard.stripe.com/${connection.stripeAccountId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-foreground underline underline-offset-4"
            >
              Open Stripe <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
