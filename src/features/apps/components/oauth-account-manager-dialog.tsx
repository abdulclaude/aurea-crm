"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { AppProvider } from "@/db/enums";
import { useTRPC } from "@/trpc/client";
import { OAuthAccountRow } from "./oauth-account-row";

type OAuthAppProvider = Extract<
  AppProvider,
  "GOOGLE" | "MICROSOFT" | "SLACK" | "DISCORD"
>;

type OAuthAccountManagerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: OAuthAppProvider;
  title: string;
  onLinkAccount: () => Promise<void>;
  onSuccess: () => void;
};

export function OAuthAccountManagerDialog({
  open,
  onOpenChange,
  provider,
  title,
  onLinkAccount,
  onSuccess,
}: OAuthAccountManagerDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const options = trpc.apps.listOAuthAccounts.queryOptions({ provider });
  const accounts = useQuery({ ...options, enabled: open });
  const syncAccount = useMutation(
    trpc.apps.syncOAuthAccount.mutationOptions({
      onSuccess: (result) => {
        if (!result.connected) {
          toast.error(
            result.missingScopes
              ? `Reconnect ${title} and approve the required permissions.`
              : `The linked ${title} account is unavailable.`,
          );
          return;
        }
        toast.success(`${title} account connected.`);
        onSuccess();
      },
      onError: (error) => toast.error(error.message),
      onSettled: () =>
        queryClient.invalidateQueries({ queryKey: options.queryKey }),
    }),
  );

  const unboundAccounts =
    accounts.data?.linkedAccounts.filter(
      (account) => !account.boundProviderAccountId,
    ) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title} accounts</DialogTitle>
          <DialogDescription>
            Connect each external account separately, then choose it in the
            workflows that should use it.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto border-y">
          {accounts.isLoading ? (
            <div className="flex min-h-24 items-center justify-center">
              <Loader2 className="size-4 animate-spin" aria-label="Loading" />
            </div>
          ) : (
            <>
              {(accounts.data?.accounts ?? []).map((account, index) => {
                return (
                  <div key={account.id}>
                    {index > 0 && <Separator />}
                    <OAuthAccountRow
                      account={account}
                      pending={syncAccount.isPending}
                      onReconnect={() =>
                        syncAccount.mutate({
                          provider,
                          providerAccountId: account.id,
                        })
                      }
                    />
                  </div>
                );
              })}

              {unboundAccounts.map((account) => (
                <div key={account.id}>
                  <Separator />
                  <div className="flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Linked {title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {account.accountHint}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={
                        !account.hasRequiredScopes || syncAccount.isPending
                      }
                      onClick={() =>
                        syncAccount.mutate({
                          provider,
                          linkedAccountId: account.id,
                        })
                      }
                    >
                      Add
                    </Button>
                  </div>
                </div>
              ))}

              {!accounts.data?.accounts.length && !unboundAccounts.length && (
                <p className="py-6 text-sm text-muted-foreground">
                  No linked {title} accounts are available yet.
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onLinkAccount} disabled={syncAccount.isPending}>
            <Plus className="size-4" />
            Link another account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
