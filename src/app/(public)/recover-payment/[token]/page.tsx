import { AlertCircle, CheckCircle2, CreditCard } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatMinorUnits } from "@/features/commerce/lib/money";
import {
  createPaymentRecoveryDestination,
  getPaymentRecoveryPublicSummary,
  PaymentRecoveryPublicError,
} from "@/features/commerce/server/recovery/payment-recovery-public-service";

type PaymentRecoveryPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
};

export const metadata: Metadata = {
  title: "Payment recovery",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function PaymentRecoveryPage({
  params,
  searchParams,
}: PaymentRecoveryPageProps) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const summary = await getPaymentRecoveryPublicSummary(token).catch(
    (error: unknown) => {
      if (
        error instanceof PaymentRecoveryPublicError &&
        error.code === "INVALID_LINK"
      ) {
        notFound();
      }
      throw error;
    },
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-12">
      <div className="space-y-8">
        <header className="space-y-3">
          <div className="flex size-10 items-center justify-center border bg-muted/30">
            <CreditCard className="size-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Payment recovery</h1>
            <p className="text-sm text-muted-foreground">
              Continue through the secure payment provider for this{" "}
              {summary.target.toLowerCase()}.
            </p>
          </div>
        </header>

        <Separator />

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div className="space-y-1">
            <dt className="text-muted-foreground">Payment</dt>
            <dd className="font-medium">
              {formatMinorUnits(
                summary.amountMinor,
                summary.currency,
                summary.currencyExponent,
              )}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground">Type</dt>
            <dd className="font-medium capitalize">
              {summary.target.toLowerCase()}
            </dd>
          </div>
        </dl>

        {summary.status === "RESOLVED" ? (
          <Alert>
            <CheckCircle2 className="size-4" aria-hidden="true" />
            <AlertTitle>Payment resolved</AlertTitle>
            <AlertDescription>
              No further action is needed for this payment.
            </AlertDescription>
          </Alert>
        ) : summary.status === "UNAVAILABLE" ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" aria-hidden="true" />
            <AlertTitle>Recovery unavailable</AlertTitle>
            <AlertDescription>
              This recovery case is no longer active. Contact the studio for
              help.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {query.error ? (
              <Alert variant="destructive">
                <AlertCircle className="size-4" aria-hidden="true" />
                <AlertTitle>Secure payment unavailable</AlertTitle>
                <AlertDescription>
                  The payment provider could not be opened. Try again shortly or
                  contact the studio.
                </AlertDescription>
              </Alert>
            ) : null}
            <form action={continueRecovery}>
              <Input type="hidden" name="token" value={token} />
              <Button className="w-full" type="submit">
                <CreditCard className="size-4" aria-hidden="true" />
                Continue securely
              </Button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

async function continueRecovery(formData: FormData): Promise<never> {
  "use server";

  const token = formData.get("token");
  if (typeof token !== "string" || token.length === 0) notFound();

  let destination: string;
  try {
    destination = await createPaymentRecoveryDestination(token);
  } catch (error: unknown) {
    if (
      error instanceof PaymentRecoveryPublicError &&
      error.code === "INVALID_LINK"
    ) {
      notFound();
    }
    redirect(
      `/recover-payment/${encodeURIComponent(token)}?error=provider_unavailable`,
    );
  }
  redirect(destination);
}
