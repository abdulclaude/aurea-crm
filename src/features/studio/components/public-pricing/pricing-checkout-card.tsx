"use client";

import { CreditCard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type PricingCheckoutCardProps = {
  canCheckout: boolean;
  checkoutUrl: string | null;
  isPending: boolean;
  onCheckout: (input: {
    email: string;
    giftCardCode?: string;
    name: string;
    phone?: string;
    promoCode?: string;
  }) => void;
};

export function PricingCheckoutCard({
  canCheckout,
  checkoutUrl,
  isPending,
  onCheckout,
}: PricingCheckoutCardProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [giftCardCode, setGiftCardCode] = useState("");

  function handleCheckout(): void {
    if (!name.trim() || !email.trim()) {
      toast.error("Enter your name and email");
      return;
    }

    onCheckout({
      name,
      email,
      phone: phone || undefined,
      promoCode: promoCode || undefined,
      giftCardCode: giftCardCode || undefined,
    });
  }

  return (
    <Card className="p-5">
      {checkoutUrl ? (
        <div className="space-y-4 text-center">
          <CreditCard className="mx-auto size-10 text-primary" />
          <div>
            <p className="text-sm font-semibold">Checkout ready</p>
            <p className="mt-1 text-xs text-primary/50">
              Continue to Stripe to complete your purchase.
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
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold">Your details</p>
            <p className="mt-1 text-xs text-primary/50">
              A member profile will be created or matched by email.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pricing-checkout-name">Name</Label>
            <Input
              id="pricing-checkout-name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pricing-checkout-email">Email</Label>
            <Input
              id="pricing-checkout-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pricing-checkout-phone">Phone</Label>
            <Input
              id="pricing-checkout-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <Separator />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pricing-checkout-promo">Promo code</Label>
              <Input
                id="pricing-checkout-promo"
                autoComplete="off"
                value={promoCode}
                onChange={(event) =>
                  setPromoCode(event.target.value.toUpperCase())
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pricing-checkout-gift-card">Gift card</Label>
              <Input
                id="pricing-checkout-gift-card"
                autoComplete="off"
                value={giftCardCode}
                onChange={(event) =>
                  setGiftCardCode(event.target.value.toUpperCase())
                }
              />
            </div>
          </div>
          <Button
            className="w-full"
            disabled={isPending || !canCheckout}
            onClick={handleCheckout}
          >
            {isPending ? "Creating checkout..." : "Continue to checkout"}
          </Button>
          {!canCheckout && (
            <p className="text-center text-xs text-amber-500">
              This option needs to be synced with Stripe before purchase.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
