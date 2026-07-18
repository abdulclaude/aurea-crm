"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Clipboard, RefreshCw, Save } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  formatPublicationDate,
  type PublicationTarget,
} from "@/features/publications/components/publication-ui-types";
import { useTRPC } from "@/trpc/client";

type Props = {
  target: PublicationTarget;
  onChanged: () => Promise<void>;
};

async function copyValue(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
  } catch {
    toast.error("Could not copy to clipboard");
  }
}

export function PublicationDomainPanel({
  target,
  onChanged,
}: Props): React.JSX.Element {
  const trpc = useTRPC();
  const [domainHost, setDomainHost] = React.useState(target.domainHost ?? "");
  const instructions = useQuery(
    trpc.publications.domainInstructions.queryOptions({ id: target.id }),
  );
  const update = useMutation(trpc.publications.update.mutationOptions());
  const verify = useMutation(trpc.publications.verifyDomain.mutationOptions());

  async function saveDomain(): Promise<void> {
    try {
      await update.mutateAsync({
        id: target.id,
        domainHost: domainHost.trim() || null,
      });
      await onChanged();
      toast.success(
        domainHost.trim() ? "Domain saved" : "Custom domain removed",
      );
    } catch (error: unknown) {
      toast.error("Could not update domain", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function verifyDomain(): Promise<void> {
    try {
      await verify.mutateAsync({ id: target.id });
      await onChanged();
      toast.success("Domain check completed");
    } catch (error: unknown) {
      toast.error("Domain check failed", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  const record = instructions.data;
  return (
    <div>
      <section className="space-y-4 p-5">
        <div>
          <h3 className="text-sm font-semibold">Custom domain</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Aurea verifies ownership with DNS before checking TLS. It never
            changes your DNS records.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="publication-domain">Domain host</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="publication-domain"
              value={domainHost}
              onChange={(event) => setDomainHost(event.target.value)}
              placeholder="book.example.com"
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
            />
            <Button
              variant="outline"
              onClick={() => void saveDomain()}
              disabled={update.isPending}
            >
              <Save aria-hidden="true" />
              Save
            </Button>
          </div>
        </div>
      </section>
      <Separator />
      <section className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Verification</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Add this TXT record with your DNS provider, then run a check.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">DNS {target.domainStatus}</Badge>
            <Badge variant="outline">SSL {target.sslStatus}</Badge>
          </div>
        </div>

        {instructions.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading DNS record...</p>
        ) : instructions.error ? (
          <p className="text-xs text-destructive">
            {instructions.error.message}
          </p>
        ) : !record?.host || !record.recordName ? (
          <p className="border-y py-4 text-xs text-muted-foreground">
            Save a custom domain to generate its ownership record.
          </p>
        ) : (
          <div className="divide-y border-y">
            {[
              ["Type", record.recordType],
              ["Name", record.recordName],
              ["Value", record.recordValue],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center gap-3 py-3">
                <span className="w-12 shrink-0 text-xs text-muted-foreground">
                  {label}
                </span>
                <code className="min-w-0 flex-1 break-all text-xs">
                  {value}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Copy DNS ${label.toLowerCase()}`}
                  onClick={() => void copyValue(value)}
                >
                  <Clipboard aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {target.domainError ? (
          <p className="text-xs text-destructive">{target.domainError}</p>
        ) : null}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            Last checked: {formatPublicationDate(target.domainCheckedAt)}
          </p>
          <Button
            onClick={() => void verifyDomain()}
            disabled={!target.domainHost || verify.isPending}
          >
            {target.domainStatus === "VERIFIED" ? (
              <Check aria-hidden="true" />
            ) : (
              <RefreshCw aria-hidden="true" />
            )}
            {verify.isPending ? "Checking" : "Verify domain"}
          </Button>
        </div>
      </section>
    </div>
  );
}
