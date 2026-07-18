import { Plus, Workflow } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import type { PricingOptionDetail } from "./types";

export function PricingOptionAutomations({
  option,
}: {
  option: PricingOptionDetail;
}) {
  const createHref = `/workflows?studioEvent=PRICING_OPTION_PURCHASED&pricingOptionId=${encodeURIComponent(option.id)}&resourceName=${encodeURIComponent(option.name)}`;
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div>
          <h2 className="text-sm font-medium">Purchase automations</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Workflows that run when this option is purchased.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={createHref}>
            <Plus className="size-4" />
            Create automation
          </Link>
        </Button>
      </div>
      <Separator />
      {option.automations.length ? (
        <div className="divide-y divide-border">
          {option.automations.map((automation) => (
            <div
              key={automation.workflowId}
              className="flex items-center justify-between gap-4 px-6 py-4"
            >
              <div className="flex min-w-0 items-start gap-3">
                <Workflow className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {automation.workflowName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {automation.description ?? "Purchase workflow"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={automation.archived ? "secondary" : "default"}>
                  {automation.archived ? "Draft" : "Active"}
                </Badge>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/workflows/${automation.workflowId}`}>Open</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-6 py-12 text-center text-sm text-muted-foreground">
          No automations are linked to this pricing option.
        </p>
      )}
    </div>
  );
}
