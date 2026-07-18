"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Gift, Loader2 } from "lucide-react";
import { use, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  currencyExponent,
  decimalToMinorUnits,
  formatDecimalMoney,
} from "@/features/commerce/lib/money";
import { useTRPC } from "@/trpc/client";

export default function PublicGiftCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ publication?: string }>;
}) {
  const { orgSlug } = use(params);
  const { publication: publicationTargetSlug } = use(searchParams);
  const trpc = useTRPC();
  const [isMounted, setIsMounted] = useState(false);
  const [amount, setAmount] = useState("50");
  const [purchaserName, setPurchaserName] = useState("");
  const [purchaserEmail, setPurchaserEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const checkoutRequestIdRef = useRef<string | null>(null);

  useEffect(() => setIsMounted(true), []);

  const pageQuery = useQuery({
    ...trpc.giftCards.getPublicPurchasePage.queryOptions({
      orgSlug,
      publicationTargetSlug,
    }),
    enabled: isMounted,
  });
  const checkout = useMutation(
    trpc.studioBilling.createPublicGiftCardCheckout.mutationOptions({
      onSuccess: (data) => {
        if (data.url) setCheckoutUrl(data.url);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (!isMounted || pageQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary/50" />
      </div>
    );
  }

  if (!pageQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-sm p-6 text-center">
          <p className="text-sm font-semibold text-primary">Studio not found</p>
        </Card>
      </div>
    );
  }

  const { studio, suggestedAmounts } = pageQuery.data;
  const currency = studio.currency ?? "GBP";

  function handleCheckout(): void {
    if (!purchaserName.trim() || !purchaserEmail.trim()) {
      toast.error("Enter purchaser name and email");
      return;
    }
    try {
      if (decimalToMinorUnits(amount, currencyExponent(currency)) <= 0) {
        throw new Error("Gift card amount must be positive");
      }
    } catch {
      toast.error("Enter a valid gift card amount");
      return;
    }

    checkout.mutate({
      checkoutRequestId:
        checkoutRequestIdRef.current ??
        (checkoutRequestIdRef.current = crypto.randomUUID()),
      orgSlug,
      publicationTargetSlug,
      amount: amount.trim(),
      currency,
      purchaserName,
      purchaserEmail,
      recipientName: recipientName || undefined,
      recipientEmail: recipientEmail || undefined,
      message: message || undefined,
      successUrl: `${window.location.origin}/gift-cards/${orgSlug}?success=1`,
      cancelUrl: `${window.location.origin}/gift-cards/${orgSlug}`,
    });
  }

  return (
    <div className="min-h-screen bg-background text-primary">
      <main className="mx-auto grid min-h-screen max-w-5xl gap-8 px-4 py-8 md:grid-cols-[1fr_380px] md:items-center">
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            {studio.logo ? (
              <img
                src={studio.logo}
                alt={studio.name}
                className="size-11 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-11 items-center justify-center rounded-full bg-primary/10">
                <Gift className="size-5" />
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wider text-primary/50">
                {studio.name}
              </p>
              <h1 className="text-2xl font-semibold">Gift card</h1>
            </div>
          </div>

          <p className="max-w-2xl text-sm leading-6 text-primary/65">
            Purchase a studio gift card securely online. The balance can be used
            during checkout for eligible studio purchases.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {suggestedAmounts.map((presetValue) => {
              return (
                <Button
                  key={presetValue}
                  type="button"
                  variant={amount === presetValue ? "default" : "outline"}
                  onClick={() => setAmount(presetValue)}
                >
                  {formatDecimalMoney(presetValue, currency)}
                </Button>
              );
            })}
          </div>
        </section>

        <Card className="space-y-4 p-5">
          {checkoutUrl ? (
            <div className="space-y-4 text-center">
              <Gift className="mx-auto size-10 text-primary" />
              <div>
                <p className="text-sm font-semibold">Checkout ready</p>
                <p className="mt-1 text-xs text-primary/50">
                  Continue to Stripe to complete the gift card purchase.
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => window.location.assign(checkoutUrl)}
              >
                Open checkout
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="gift-card-amount">Amount</Label>
                <Input
                  id="gift-card-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="gift-card-purchaser-name">Your name</Label>
                  <Input
                    id="gift-card-purchaser-name"
                    autoComplete="name"
                    value={purchaserName}
                    onChange={(event) => setPurchaserName(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gift-card-purchaser-email">Your email</Label>
                  <Input
                    id="gift-card-purchaser-email"
                    type="email"
                    autoComplete="email"
                    value={purchaserEmail}
                    onChange={(event) => setPurchaserEmail(event.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="gift-card-recipient-name">
                    Recipient name
                  </Label>
                  <Input
                    id="gift-card-recipient-name"
                    autoComplete="off"
                    value={recipientName}
                    onChange={(event) => setRecipientName(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gift-card-recipient-email">
                    Recipient email
                  </Label>
                  <Input
                    id="gift-card-recipient-email"
                    type="email"
                    autoComplete="off"
                    value={recipientEmail}
                    onChange={(event) => setRecipientEmail(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gift-card-message">Message</Label>
                <Textarea
                  id="gift-card-message"
                  rows={3}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </div>
              <Button
                className="w-full"
                disabled={checkout.isPending}
                onClick={handleCheckout}
              >
                {checkout.isPending
                  ? "Creating checkout..."
                  : "Continue to checkout"}
              </Button>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
