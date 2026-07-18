import { ExternalLink, Settings2 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import type { PricingOptionDetail } from "./types";

export function PricingOptionSell({ option }: { option: PricingOptionDetail }) {
  const channels = [
    { label: "Public pricing", enabled: option.isPublic && !option.isHidden },
    { label: "Point of sale", enabled: option.showInPos },
    { label: "Direct purchase", enabled: option.directPurchaseEnabled },
  ];
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div>
          <h2 className="text-sm font-medium">Sales channels</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Control where members can discover and buy this option.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings/publication">
            <Settings2 className="size-4" />
            Publication settings
          </Link>
        </Button>
      </div>
      <Separator />
      <div className="divide-y divide-border">
        {channels.map((channel) => (
          <div
            key={channel.label}
            className="flex items-center justify-between px-6 py-4"
          >
            <span className="text-sm">{channel.label}</span>
            <Badge variant={channel.enabled ? "default" : "secondary"}>
              {channel.enabled ? "Enabled" : "Off"}
            </Badge>
          </div>
        ))}
      </div>
      <Separator />
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Buy page</p>
          <p className="truncate text-sm">
            {option.buyPagePath ?? "Direct purchase is off"}
          </p>
        </div>
        {option.buyPagePath ? (
          <Button asChild size="sm">
            <Link href={option.buyPagePath} target="_blank">
              <ExternalLink className="size-4" />
              Open buy page
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
