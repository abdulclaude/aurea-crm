"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Unplug } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTRPC } from "@/trpc/client";
import {
  EMPTY_RESEND_ACCOUNT_FORM,
  ResendAccountForm,
  type ResendAccountFormState,
} from "./resend-account-form";

export function ResendAccountSettings() {
  const trpc = useTRPC();
  const accountsQuery = useQuery(trpc.providerAccounts.list.queryOptions());
  const [form, setForm] = useState<ResendAccountFormState>(
    EMPTY_RESEND_ACCOUNT_FORM,
  );
  const account = accountsQuery.data?.find(
    (item) => item.provider === "RESEND" && !item.inherited,
  );
  const inheritedAccount = accountsQuery.data?.find(
    (item) => item.provider === "RESEND" && item.inherited,
  );

  useEffect(() => {
    const source = account ?? inheritedAccount;
    if (!source?.config || !("defaultFromEmail" in source.config)) return;
    const config = source.config;
    setForm((current) => ({
      ...current,
      displayName: source.displayName,
      defaultFromEmail: config.defaultFromEmail ?? "",
      defaultFromName: config.defaultFromName ?? "",
      defaultReplyTo: config.defaultReplyTo ?? "",
      inheritToLocations: config.inheritToLocations,
    }));
  }, [account, inheritedAccount]);

  const saveMutation = useMutation(
    trpc.providerAccounts.saveResend.mutationOptions({
      onSuccess: async () => {
        toast.success("Resend account saved for this workspace");
        setForm((current) => ({
          ...current,
          apiKey: "",
          webhookSecret: "",
        }));
        await accountsQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const disconnectMutation = useMutation(
    trpc.providerAccounts.disconnect.mutationOptions({
      onSuccess: async () => {
        toast.success("Resend account disconnected");
        await accountsQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (accountsQuery.isLoading) {
    return (
      <div role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        Loading email account
      </div>
    );
  }
  if (accountsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Email account could not be loaded</AlertTitle>
        <AlertDescription>
          <Button variant="outline" size="sm" onClick={() => accountsQuery.refetch()}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium">Resend</h2>
            {(account ?? inheritedAccount)?.status === "ACTIVE" && (
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="size-3" /> Active
              </Badge>
            )}
            {inheritedAccount && !account && (
              <Badge variant="secondary">Organization account</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Email sends, domains, templates, and webhooks use this account only
            within its organization and location scope.
          </p>
        </div>
        {account?.status === "ACTIVE" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => disconnectMutation.mutate({ id: account.id })}
            disabled={disconnectMutation.isPending}
          >
            <Unplug className="size-4" /> Disconnect
          </Button>
        )}
      </div>

      <ResendAccountForm
        accountId={account?.id ?? null}
        hasSecret={account?.hasSecret ?? false}
        hasWebhookSecret={account?.hasWebhookSecret ?? false}
        form={form}
        pending={saveMutation.isPending}
        onChange={setForm}
        onSave={() =>
          saveMutation.mutate({
            ...form,
            defaultReplyTo: form.defaultReplyTo || null,
          })
        }
      />
    </div>
  );
}
