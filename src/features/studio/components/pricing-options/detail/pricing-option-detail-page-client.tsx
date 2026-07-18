"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Workflow } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTRPC } from "@/trpc/client";

import { PricingOptionAccess } from "./pricing-option-access";
import { PricingOptionAutomations } from "./pricing-option-automations";
import { PricingOptionOverview } from "./pricing-option-overview";
import { PricingOptionSell } from "./pricing-option-sell";
import { PricingOptionSubscribers } from "./pricing-option-subscribers";

export function PricingOptionDetailPageClient({
  pricingOptionId,
}: {
  pricingOptionId: string;
}) {
  const trpc = useTRPC();
  const optionQuery = useQuery(
    trpc.pricingOptions.getById.queryOptions({ id: pricingOptionId }),
  );
  if (optionQuery.isLoading) return <PricingOptionDetailSkeleton />;
  if (!optionQuery.data) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          {optionQuery.error?.message ?? "Pricing option not found."}
        </p>
      </div>
    );
  }
  const option = optionQuery.data;
  const createAutomationHref = `/workflows?studioEvent=PRICING_OPTION_PURCHASED&pricingOptionId=${encodeURIComponent(option.id)}&resourceName=${encodeURIComponent(option.name)}`;

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
            <Link href="/studio/pricing-options">
              <ArrowLeft className="size-4" />
              Pricing options
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold">{option.name}</h1>
            <Badge variant={option.isActive ? "default" : "secondary"}>
              {option.isActive ? "Active" : "Archived"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {money(option.price, option.currency)} ·{" "}
            {formatLabel(option.billingInterval)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {option.buyPagePath ? (
            <Button asChild variant="outline" size="sm">
              <Link href={option.buyPagePath} target="_blank">
                <ExternalLink className="size-4" />
                Buy page
              </Link>
            </Button>
          ) : null}
          <Button asChild size="sm">
            <Link href={createAutomationHref}>
              <Workflow className="size-4" />
              Create automation
            </Link>
          </Button>
        </div>
      </div>
      <Separator />
      <Tabs defaultValue="overview">
        <TabsList className="h-11 w-full justify-start gap-1 rounded-none border-b bg-transparent px-6 py-0">
          {[
            ["overview", "Overview"],
            ["access", "Access"],
            ["subscribers", `Subscribers (${option.subscribers.length})`],
            ["sell", "Sell"],
            ["automations", `Automations (${option.automations.length})`],
          ].map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="h-11 rounded-none border-b-2 border-transparent px-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview" className="m-0">
          <PricingOptionOverview option={option} />
        </TabsContent>
        <TabsContent value="access" className="m-0">
          <PricingOptionAccess option={option} />
        </TabsContent>
        <TabsContent value="subscribers" className="m-0">
          <PricingOptionSubscribers option={option} />
        </TabsContent>
        <TabsContent value="sell" className="m-0">
          <PricingOptionSell option={option} />
        </TabsContent>
        <TabsContent value="automations" className="m-0">
          <PricingOptionAutomations option={option} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PricingOptionDetailSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-6 w-64" />
      <Skeleton className="h-4 w-40" />
      <Separator />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function money(value: string, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(Number(value));
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
