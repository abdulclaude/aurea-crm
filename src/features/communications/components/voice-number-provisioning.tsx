"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Phone, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { useTRPC } from "@/trpc/client";

type Quote = {
  quoteId: string;
  phoneNumber: string;
  monthlyProviderCost: string;
  currency: string;
  regulatoryRequirement: string;
};

export function VoiceNumberProvisioning({ entitled }: { entitled: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [country, setCountry] = useState("GB");
  const [selected, setSelected] = useState<Quote | null>(null);
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
  const purchase = useMutation(
    trpc.communications.purchasePhoneNumber.mutationOptions({
      onSuccess: async () => {
        setSelected(null);
        toast.success("Voice number purchase queued");
        await refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  return (
    <div className="space-y-3 border-b pb-5">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => provision.mutate()}
          disabled={!entitled || provision.isPending}
        >
          {provision.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Phone />
          )}
          Provision account
        </Button>
        <Input
          aria-label="Two-letter country code"
          className="w-20"
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
              capabilities: { sms: false, voice: true },
              limit: 10,
            })
          }
          disabled={!entitled || country.length !== 2 || search.isPending}
        >
          {search.isPending ? <Loader2 className="animate-spin" /> : <Search />}
          Search voice numbers
        </Button>
      </div>
      {search.data?.map((quote) => (
        <div
          key={quote.quoteId}
          className="flex flex-col items-start justify-between gap-3 py-2 sm:flex-row sm:items-center"
        >
          <div className="min-w-0">
            <p className="break-all text-sm">{quote.phoneNumber}</p>
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
            onClick={() => setSelected(quote)}
          >
            Buy
          </Button>
        </div>
      ))}
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm voice number purchase</DialogTitle>
            <DialogDescription>
              {selected?.phoneNumber} at {selected?.currency}{" "}
              {selected?.monthlyProviderCost} per month.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button
              disabled={!selected || purchase.isPending}
              onClick={() =>
                selected &&
                purchase.mutate({
                  quoteId: selected.quoteId,
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
    </div>
  );
}
