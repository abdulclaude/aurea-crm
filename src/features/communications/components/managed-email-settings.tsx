"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Globe2, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTRPC } from "@/trpc/client";

export function ManagedEmailSettings() {
  const trpc = useTRPC();
  const overview = useQuery(trpc.communications.overview.queryOptions());
  if (overview.isLoading) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 text-xs text-muted-foreground"
      >
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        Loading managed email
      </div>
    );
  }
  if (overview.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Email configuration could not be loaded</AlertTitle>
        <AlertDescription>
          Refresh the page or contact support if the problem continues.
        </AlertDescription>
      </Alert>
    );
  }
  if (!overview.data) return null;
  const profile = overview.data.profile;
  const activeDomains = overview.data.domains.filter(
    (domain) => domain.lifecycleState === "ACTIVE" && !domain.isDisabled,
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium">Aurea managed email</h2>
            <Badge variant="outline" className="gap-1">
              <ShieldCheck aria-hidden="true" className="size-3" />
              Platform managed
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Provider credentials and delivery webhooks are managed by Aurea.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/campaigns/domains">
            <Globe2 aria-hidden="true" className="size-4" />
            Sender domains
          </Link>
        </Button>
      </div>
      <Separator />
      <div className="grid gap-4 sm:grid-cols-2">
        <StatusRow
          label="Branded email"
          value={profile.emailState.replaceAll("_", " ").toLowerCase()}
          active={profile.emailState === "ACTIVE"}
        />
        <StatusRow
          label="Verified domains"
          value={String(activeDomains.length)}
          active={activeDomains.length > 0}
        />
      </div>
    </div>
  );
}

function StatusRow(input: { label: string; value: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-3">
      <span className="text-xs text-muted-foreground">{input.label}</span>
      <span className="flex items-center gap-1.5 text-xs font-medium capitalize">
        {input.active ? (
          <CheckCircle2
            aria-hidden="true"
            className="size-3.5 text-emerald-500"
          />
        ) : null}
        {input.value}
      </span>
    </div>
  );
}
