"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Loader2,
  Phone,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useTRPC } from "@/trpc/client";
import { SmsPolicySettings } from "./sms-policy-settings";
import { ComplianceRegistrationForm } from "./compliance-registration-form";

type PurchaseQuote = {
  quoteId: string;
  phoneNumber: string;
  monthlyProviderCost: string;
  currency: string;
  regulatoryRequirement: string;
};

export function ManagedSmsSettings() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const overview = useQuery(trpc.communications.overview.queryOptions());
  const [country, setCountry] = useState("GB");
  const [purchase, setPurchase] = useState<PurchaseQuote | null>(null);
  const [releaseId, setReleaseId] = useState<string | null>(null);
  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.communications.overview.queryKey(),
    });
  const provision = useMutation(
    trpc.communications.provisionTwilio.mutationOptions({
      onSuccess: async () => {
        toast.success("Managed account provisioning queued");
        await refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const search = useMutation(
    trpc.communications.searchPhoneNumbers.mutationOptions({
      onError: (error) => toast.error(error.message),
    }),
  );
  const buy = useMutation(
    trpc.communications.purchasePhoneNumber.mutationOptions({
      onSuccess: async () => {
        setPurchase(null);
        toast.success("Phone number purchase queued");
        await refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const setDefault = useMutation(
    trpc.communications.setDefaultPhoneNumber.mutationOptions({
      onSuccess: async () => {
        toast.success("Default number updated");
        await refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const release = useMutation(
    trpc.communications.releasePhoneNumber.mutationOptions({
      onSuccess: async () => {
        setReleaseId(null);
        toast.success("Number release scheduled");
        await refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const cancelRelease = useMutation(
    trpc.communications.cancelPhoneNumberRelease.mutationOptions({
      onSuccess: async () => {
        toast.success("Number release cancelled");
        await refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (overview.isLoading) return <Loading label="Loading text messaging" />;
  if (overview.isError || !overview.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Text messaging could not be loaded</AlertTitle>
        <AlertDescription>
          Refresh the page or contact support if the problem continues.
        </AlertDescription>
      </Alert>
    );
  }
  const { profile, phoneNumbers } = overview.data;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium">Managed text messaging</h2>
          <Badge variant="outline" className="gap-1">
            <ShieldCheck aria-hidden="true" className="size-3" /> Aurea managed
          </Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => provision.mutate()}
          disabled={provision.isPending || !profile.smsEntitledAt}
        >
          {provision.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Phone />
          )}
          Provision account
        </Button>
      </div>
      <Separator />
      <div className="flex max-w-sm gap-2">
        <Input
          aria-label="Two-letter country code"
          value={country}
          maxLength={2}
          onChange={(event) => setCountry(event.target.value.toUpperCase())}
        />
        <Button
          variant="outline"
          onClick={() =>
            search.mutate({
              country,
              numberType: "local",
              capabilities: { sms: true, voice: false },
              limit: 10,
            })
          }
          disabled={search.isPending || country.length !== 2}
        >
          {search.isPending ? <Loader2 className="animate-spin" /> : <Search />}
          Search
        </Button>
      </div>
      {search.data?.map((quote) => (
        <div
          key={quote.quoteId}
          className="flex flex-col items-start justify-between gap-3 border-b py-3 sm:flex-row sm:items-center"
        >
          <div className="min-w-0">
            <p className="break-all text-sm font-medium">{quote.phoneNumber}</p>
            <p className="text-xs text-muted-foreground">
              {quote.currency} {quote.monthlyProviderCost}/month
              {quote.regulatoryRequirement !== "none"
                ? " · Compliance required"
                : ""}
            </p>
          </div>
          <Button
            size="sm"
            aria-label={`Buy ${quote.phoneNumber}`}
            onClick={() => setPurchase(quote)}
          >
            Buy
          </Button>
        </div>
      ))}
      {phoneNumbers.map((number) => (
        <div
          key={number.id}
          className="flex flex-col items-start justify-between gap-3 border-b py-3 sm:flex-row sm:items-center"
        >
          <span className="break-all text-sm">{number.phoneNumber}</span>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1 capitalize">
              {number.status === "ACTIVE" ? (
                <CheckCircle2 className="size-3 text-emerald-500" />
              ) : null}
              {number.isDefault
                ? "Default"
                : number.status.replaceAll("_", " ").toLowerCase()}
            </Badge>
            {number.status === "ACTIVE" && !number.isDefault ? (
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Set ${number.phoneNumber} as default`}
                onClick={() => setDefault.mutate({ id: number.id })}
              >
                Set default
              </Button>
            ) : null}
            {number.status === "ACTIVE" ? (
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Release ${number.phoneNumber}`}
                onClick={() => setReleaseId(number.id)}
              >
                Release
              </Button>
            ) : null}
            {number.status === "RELEASE_SCHEDULED" ? (
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Cancel release of ${number.phoneNumber}`}
                disabled={cancelRelease.isPending}
                onClick={() => cancelRelease.mutate({ id: number.id })}
              >
                Cancel release
              </Button>
            ) : null}
          </div>
        </div>
      ))}
      <SmsPolicySettings />
      <ComplianceRegistrationForm channel="SMS" />
      <Dialog
        open={Boolean(purchase)}
        onOpenChange={(open) => !open && setPurchase(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm phone number purchase</DialogTitle>
            <DialogDescription>
              {purchase?.phoneNumber} at {purchase?.currency}{" "}
              {purchase?.monthlyProviderCost} per month.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchase(null)}>
              Cancel
            </Button>
            <Button
              disabled={buy.isPending || !purchase}
              onClick={() =>
                purchase &&
                buy.mutate({
                  quoteId: purchase.quoteId,
                  confirmPurchase: true,
                  idempotencyKey: crypto.randomUUID(),
                })
              }
            >
              Confirm purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(releaseId)}
        onOpenChange={(open) => !open && setReleaseId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule number release</DialogTitle>
            <DialogDescription>
              The number will be released after the configured grace period.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!releaseId || release.isPending}
              onClick={() =>
                releaseId &&
                release.mutate({ id: releaseId, confirmRelease: true })
              }
            >
              Confirm release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 text-xs text-muted-foreground"
    >
      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
      {label}
    </div>
  );
}
