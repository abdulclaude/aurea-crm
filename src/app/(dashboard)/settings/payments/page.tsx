"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { StripeConnectCard } from "@/features/stripe-connect/components/stripe-connect-card";
import { BankTransferCard } from "@/features/invoicing/components/bank-transfer-card";
import { Separator } from "@/components/ui/separator";

export default function PaymentsSettingsPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Handle Stripe Connect callback
    const success = searchParams.get("stripe_success");
    const error = searchParams.get("stripe_error");

    if (success === "true") {
      toast.success("Stripe account connected successfully!");
    } else if (error) {
      toast.error(decodeURIComponent(error));
    }
  }, [searchParams]);

  return (
    <div className="">
      <div className="">
        <div className="p-8">
          <h1 className="text-xl font-semibold mb-2">Payment methods</h1>
          <p className="text-xs text-muted-foreground">
            Connect your payment provider to accept payments for invoices and
            subscriptions.
          </p>
        </div>

        <Separator />

        <div className="space-y-6 p-8">
          <div>
            <StripeConnectCard />
          </div>

          <div>
            <BankTransferCard />
          </div>

          {/* Future payment providers can be added here */}
          {/* <div>
            <h2 className="text-lg font-medium mb-4">PayPal</h2>
            <PayPalConnectCard />
          </div> */}
        </div>
      </div>
    </div>
  );
}
