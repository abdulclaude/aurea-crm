"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Link2, Link2Off, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";

type InvoicePublicLinkControlsProps = {
  invoiceId: string;
};

export function InvoicePublicLinkControls({
  invoiceId,
}: InvoicePublicLinkControlsProps) {
  const trpc = useTRPC();
  const { data: permissions } = useQuery(
    trpc.permissions.getCurrent.queryOptions(),
  );
  const generateLink = useMutation(
    trpc.invoices.generatePaymentLink.mutationOptions({
      onSuccess: async (result) => {
        try {
          await navigator.clipboard.writeText(result.paymentLink);
          toast.success("Secure payment link copied");
        } catch {
          toast.error("The payment link was created but could not be copied");
        }
      },
      onError: (error) => {
        toast.error(error.message || "Could not create the payment link");
      },
    }),
  );
  const revokeLinks = useMutation(
    trpc.invoices.revokePublicLinks.mutationOptions({
      onSuccess: ({ revokedCount }) => {
        toast.success(
          revokedCount === 1
            ? "Public invoice link revoked"
            : `${revokedCount} public invoice links revoked`,
        );
      },
      onError: (error) => {
        toast.error(error.message || "Could not revoke public links");
      },
    }),
  );

  if (!permissions?.capabilities.includes("commerce.manage")) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6">
      <p className="text-xs font-medium text-foreground">Public invoice</p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={generateLink.isPending}
          onClick={() =>
            generateLink.mutate({ invoiceId, provider: "HOSTED" })
          }
        >
          {generateLink.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Link2 className="size-4" />
          )}
          Copy payment link
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={revokeLinks.isPending}
            >
              <Link2Off className="size-4" />
              Revoke links
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke public invoice links?</AlertDialogTitle>
              <AlertDialogDescription>
                Existing payment and view links will stop working immediately.
                You can create a new payment link afterwards.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => revokeLinks.mutate({ invoiceId })}
              >
                Revoke links
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
