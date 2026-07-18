"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, TicketPercent } from "lucide-react";
import { use, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PricingCheckoutCard } from "@/features/studio/components/public-pricing/pricing-checkout-card";
import { useTRPC } from "@/trpc/client";

function formatCurrency(value: unknown, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    Number(value ?? 0),
  );
}

function intervalLabel(value: string): string {
  if (value === "ONE_TIME") return "one-time";
  return value.toLowerCase();
}

export default function PricingBuyPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; pricingSlug: string }>;
  searchParams: Promise<{ publication?: string }>;
}) {
  const { orgSlug, pricingSlug } = use(params);
  const { publication: publicationTargetSlug } = use(searchParams);
  const trpc = useTRPC();
  const [isMounted, setIsMounted] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const checkoutRequestIdRef = useRef<string | null>(null);

  useEffect(() => setIsMounted(true), []);

  const pageQuery = useQuery({
    ...trpc.pricingOptions.getBuyPage.queryOptions({
      orgSlug,
      pricingSlug,
      publicationTargetSlug,
    }),
    enabled: isMounted,
  });
  const checkout = useMutation(
    trpc.studioBilling.createPublicPricingOptionCheckout.mutationOptions({
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
          <p className="text-sm font-semibold text-primary">Offer not found</p>
          <p className="mt-2 text-xs text-primary/50">
            This pricing option is unavailable or no longer public.
          </p>
        </Card>
      </div>
    );
  }

  const { studio, pricingOption, publicationPolicy } = pageQuery.data;
  const canCheckout =
    publicationPolicy.allowDirectPurchase &&
    (pricingOption.type === "ACCOUNT_CREDIT" ||
      Boolean(pricingOption.stripePriceId));

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
                <TicketPercent className="size-5" />
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wider text-primary/50">
                {studio.name}
              </p>
              <h1 className="text-2xl font-semibold">{pricingOption.name}</h1>
            </div>
          </div>

          <div className="space-y-3">
            <Badge variant="outline" className="w-fit text-[11px]">
              {pricingOption.type.toLowerCase().replaceAll("_", " ")}
            </Badge>
            {pricingOption.descriptionHtml ? (
              <div
                className="max-w-2xl text-sm leading-6 text-primary/65 [&_p:not(:last-child)]:mb-3"
                dangerouslySetInnerHTML={{
                  __html: pricingOption.descriptionHtml,
                }}
              />
            ) : (
              <p className="max-w-2xl text-sm leading-6 text-primary/65">
                {pricingOption.accessSummary ??
                  "Purchase this option securely online."}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs text-primary/50">Price</p>
              <p className="mt-1 text-xl font-semibold">
                {formatCurrency(pricingOption.price, pricingOption.currency)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-primary/50">Billing</p>
              <p className="mt-1 text-sm font-medium">
                {intervalLabel(pricingOption.billingInterval)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-primary/50">Access</p>
              <p className="mt-1 text-sm font-medium">
                {pricingOption.classCredits
                  ? `${pricingOption.classCredits} credits`
                  : (pricingOption.accessSummary ?? "Included")}
              </p>
            </Card>
          </div>

          {publicationPolicy.showTerms && pricingOption.termsHtml && (
            <div
              className="max-w-2xl text-xs leading-5 text-primary/45 [&_p:not(:last-child)]:mb-2"
              dangerouslySetInnerHTML={{ __html: pricingOption.termsHtml }}
            />
          )}
        </section>

        <PricingCheckoutCard
          canCheckout={canCheckout}
          checkoutUrl={checkoutUrl}
          isPending={checkout.isPending}
          onCheckout={(input) =>
            checkout.mutate({
              checkoutRequestId:
                checkoutRequestIdRef.current ??
                (checkoutRequestIdRef.current = crypto.randomUUID()),
              orgSlug,
              pricingSlug,
              publicationTargetSlug,
              ...input,
              successUrl: `${window.location.origin}/pricing/${orgSlug}/${pricingSlug}?success=1`,
              cancelUrl: `${window.location.origin}/pricing/${orgSlug}/${pricingSlug}`,
            })
          }
        />
      </main>
    </div>
  );
}
