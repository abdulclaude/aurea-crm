"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Unplug } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  EMPTY_SMS_ACCOUNT_FORM,
  SmsAccountForm,
  type SmsAccountFormState,
} from "@/features/provider-accounts/components/sms-account-form";
import { useTRPC } from "@/trpc/client";

export function SmsAccountSettings() {
  const trpc = useTRPC();
  const configQuery = useQuery(trpc.sms.getConfig.queryOptions());
  const [form, setForm] = useState<SmsAccountFormState>(
    EMPTY_SMS_ACCOUNT_FORM,
  );
  const config = configQuery.data;
  const hasLocalAccount = Boolean(config && !config.inherited);

  useEffect(() => {
    if (!config) return;
    setForm({
      provider: config.provider,
      displayName: config.displayName,
      accountIdentifier: config.externalAccountId ?? "",
      secret: "",
      fromNumber: config.fromNumber,
      monthlyLimit: config.monthlyLimit,
      inheritToLocations: config.inheritToLocations,
    });
  }, [config]);

  const saveMutation = useMutation(
    trpc.sms.saveConfig.mutationOptions({
      onSuccess: async () => {
        toast.success("SMS account saved for this workspace");
        setForm((current) => ({ ...current, secret: "" }));
        await configQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const disconnectMutation = useMutation(
    trpc.sms.disconnectConfig.mutationOptions({
      onSuccess: async () => {
        toast.success("SMS account disconnected");
        await configQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (configQuery.isLoading) {
    return (
      <div role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        Loading text messaging account
      </div>
    );
  }
  if (configQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Text messaging account could not be loaded</AlertTitle>
        <AlertDescription>
          <Button variant="outline" size="sm" onClick={() => configQuery.refetch()}>
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
            <h2 className="text-sm font-medium">SMS</h2>
            {config?.isActive && (
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="size-3" /> Active
              </Badge>
            )}
            {config?.inherited && (
              <Badge variant="secondary">Organization account</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Outbox delivery uses an encrypted account bound to this
            organization and location.
          </p>
        </div>
        {hasLocalAccount && config?.isActive && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
          >
            <Unplug className="size-4" /> Disconnect
          </Button>
        )}
      </div>

      <SmsAccountForm
        hasLocalAccount={hasLocalAccount}
        form={form}
        pending={saveMutation.isPending}
        onChange={setForm}
        onSave={() => saveMutation.mutate(form)}
      />
    </div>
  );
}
