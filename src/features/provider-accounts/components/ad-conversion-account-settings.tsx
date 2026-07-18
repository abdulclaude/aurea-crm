"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AdConversionAccountForm,
  type AdConversionAccountFormState,
  emptyAdConversionForm,
} from "@/features/provider-accounts/components/ad-conversion-account-form";
import {
  type AdConversionProvider,
  adConversionProviderSchema,
} from "@/features/provider-accounts/contracts";
import { useTRPC } from "@/trpc/client";
import { AdConversionAccountHeader } from "./ad-conversion-account-header";

const PROVIDERS: Array<{ provider: AdConversionProvider; label: string }> = [
  { provider: "META_CONVERSIONS", label: "Meta" },
  { provider: "GOOGLE_ADS", label: "Google Ads" },
  { provider: "TIKTOK_EVENTS", label: "TikTok" },
];

export function AdConversionAccountSettings() {
  const trpc = useTRPC();
  const accountsQuery = useQuery(trpc.providerAccounts.list.queryOptions());
  const [provider, setProvider] = useState<AdConversionProvider>(
    "META_CONVERSIONS",
  );
  const [form, setForm] = useState<AdConversionAccountFormState>(() =>
    emptyAdConversionForm("META_CONVERSIONS"),
  );
  const accounts = accountsQuery.data ?? [];
  const localAccount = useMemo(
    () => accounts.find((item) => item.provider === provider && !item.inherited),
    [accounts, provider],
  );
  const inheritedAccount = useMemo(
    () =>
      accounts.find(
        (item) =>
          item.provider === provider &&
          item.inherited &&
          item.config &&
          "inheritToLocations" in item.config &&
          item.config.inheritToLocations,
      ),
    [accounts, provider],
  );
  const displayedAccount = localAccount ?? inheritedAccount;

  useEffect(() => {
    const next = emptyAdConversionForm(provider);
    const config = displayedAccount?.config;
    if (!config || !("provider" in config) || config.provider !== provider) {
      setForm(next);
      return;
    }
    setForm({
      ...next,
      displayName: displayedAccount.displayName,
      inheritToLocations: config.inheritToLocations,
      pixelId: config.provider === "META_CONVERSIONS" ? config.pixelId : "",
      pixelCode: config.provider === "TIKTOK_EVENTS" ? config.pixelCode : "",
      customerId: config.provider === "GOOGLE_ADS" ? config.customerId : "",
      conversionActionId:
        config.provider === "GOOGLE_ADS" ? config.conversionActionId : "",
      loginCustomerId:
        config.provider === "GOOGLE_ADS"
          ? config.loginCustomerId ?? ""
          : "",
      testEventCode:
        config.provider === "META_CONVERSIONS" ||
        config.provider === "TIKTOK_EVENTS"
          ? config.testEventCode ?? ""
          : "",
    });
  }, [displayedAccount, provider]);

  const saveMutation = useMutation(
    trpc.providerAccounts.saveAdConversion.mutationOptions({
      onSuccess: async () => {
        toast.success("Ad conversion account saved for this workspace");
        setForm((current) => ({
          ...current,
          accessToken: "",
          developerToken: "",
        }));
        await accountsQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const disconnectMutation = useMutation(
    trpc.providerAccounts.disconnect.mutationOptions({
      onSuccess: async () => {
        toast.success("Ad conversion account disconnected");
        await accountsQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (accountsQuery.isLoading) {
    return <Loader2 className="size-5 animate-spin text-muted-foreground" />;
  }

  const save = () => {
    const common = {
      displayName: form.displayName,
      inheritToLocations: form.inheritToLocations,
    };
    switch (form.provider) {
      case "META_CONVERSIONS":
        saveMutation.mutate({
          ...common,
          provider: form.provider,
          pixelId: form.pixelId,
          testEventCode: form.testEventCode || null,
          accessToken: form.accessToken,
        });
        break;
      case "GOOGLE_ADS":
        saveMutation.mutate({
          ...common,
          provider: form.provider,
          customerId: form.customerId,
          conversionActionId: form.conversionActionId,
          loginCustomerId: form.loginCustomerId || null,
          developerToken: form.developerToken,
          accessToken: form.accessToken,
        });
        break;
      case "TIKTOK_EVENTS":
        saveMutation.mutate({
          ...common,
          provider: form.provider,
          pixelCode: form.pixelCode,
          testEventCode: form.testEventCode || null,
          accessToken: form.accessToken,
        });
        break;
    }
  };

  return (
    <div className="space-y-6">
      <AdConversionAccountHeader
        active={displayedAccount?.status === "ACTIVE"}
        inherited={Boolean(inheritedAccount && !localAccount)}
        lastErrorCode={displayedAccount?.lastErrorCode ?? null}
        lastHealthCheckAt={displayedAccount?.lastHealthCheckAt ?? null}
        canDisconnect={localAccount?.status === "ACTIVE"}
        disconnecting={disconnectMutation.isPending}
        onDisconnect={() => {
          if (localAccount) disconnectMutation.mutate({ id: localAccount.id });
        }}
      />

      <Tabs
        value={provider}
        onValueChange={(value) => {
          const parsed = adConversionProviderSchema.safeParse(value);
          if (parsed.success) setProvider(parsed.data);
        }}
      >
        <TabsList>
          {PROVIDERS.map((item) => (
            <TabsTrigger key={item.provider} value={item.provider}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {PROVIDERS.map((item) => (
          <TabsContent key={item.provider} value={item.provider} className="pt-4">
            <AdConversionAccountForm
              hasLocalAccount={Boolean(localAccount)}
              hasSecret={localAccount?.hasSecret ?? false}
              form={form}
              pending={saveMutation.isPending}
              onChange={setForm}
              onSave={save}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
