"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { AdConversionProvider } from "@/features/provider-accounts/contracts";

export type AdConversionAccountFormState = {
  provider: AdConversionProvider;
  displayName: string;
  pixelId: string;
  pixelCode: string;
  customerId: string;
  conversionActionId: string;
  loginCustomerId: string;
  testEventCode: string;
  accessToken: string;
  developerToken: string;
  inheritToLocations: boolean;
};

const PROVIDER_NAMES: Record<AdConversionProvider, string> = {
  META_CONVERSIONS: "Meta Conversions API",
  GOOGLE_ADS: "Google Ads",
  TIKTOK_EVENTS: "TikTok Events API",
};

export function emptyAdConversionForm(
  provider: AdConversionProvider,
): AdConversionAccountFormState {
  return {
    provider,
    displayName: PROVIDER_NAMES[provider],
    pixelId: "",
    pixelCode: "",
    customerId: "",
    conversionActionId: "",
    loginCustomerId: "",
    testEventCode: "",
    accessToken: "",
    developerToken: "",
    inheritToLocations: false,
  };
}

type Props = {
  hasLocalAccount: boolean;
  hasSecret: boolean;
  form: AdConversionAccountFormState;
  pending: boolean;
  onChange: (form: AdConversionAccountFormState) => void;
  onSave: () => void;
};

export function AdConversionAccountForm({
  hasLocalAccount,
  hasSecret,
  form,
  pending,
  onChange,
  onSave,
}: Props) {
  const update = <K extends keyof AdConversionAccountFormState>(
    key: K,
    value: AdConversionAccountFormState[K],
  ) => onChange({ ...form, [key]: value });
  const hasProviderConfig =
    form.provider === "META_CONVERSIONS"
      ? Boolean(form.pixelId.trim())
      : form.provider === "GOOGLE_ADS"
        ? Boolean(form.customerId.trim() && form.conversionActionId.trim())
        : Boolean(form.pixelCode.trim());
  const hasCredentials =
    hasLocalAccount ||
    (form.provider === "GOOGLE_ADS"
      ? Boolean(form.accessToken.trim() && form.developerToken.trim())
      : Boolean(form.accessToken.trim()));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Account name">
          <Input
            value={form.displayName}
            onChange={(event) => update("displayName", event.target.value)}
          />
        </Field>
        {form.provider === "META_CONVERSIONS" && (
          <Field label="Dataset or pixel ID">
            <Input
              value={form.pixelId}
              onChange={(event) => update("pixelId", event.target.value)}
            />
          </Field>
        )}
        {form.provider === "TIKTOK_EVENTS" && (
          <Field label="Pixel code">
            <Input
              value={form.pixelCode}
              onChange={(event) => update("pixelCode", event.target.value)}
            />
          </Field>
        )}
        {form.provider === "GOOGLE_ADS" && (
          <>
            <Field label="Customer ID">
              <Input
                inputMode="numeric"
                placeholder="Remove hyphens"
                value={form.customerId}
                onChange={(event) => update("customerId", event.target.value)}
              />
            </Field>
            <Field label="Conversion action ID">
              <Input
                inputMode="numeric"
                value={form.conversionActionId}
                onChange={(event) =>
                  update("conversionActionId", event.target.value)
                }
              />
            </Field>
            <Field label="Manager customer ID">
              <Input
                inputMode="numeric"
                placeholder="Optional, without hyphens"
                value={form.loginCustomerId}
                onChange={(event) =>
                  update("loginCustomerId", event.target.value)
                }
              />
            </Field>
            <Field label="Developer token">
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={hasSecret ? "Enter with a replacement access token" : "Required"}
                value={form.developerToken}
                onChange={(event) =>
                  update("developerToken", event.target.value)
                }
              />
            </Field>
          </>
        )}
        <Field label="Access token">
          <Input
            type="password"
            autoComplete="new-password"
            placeholder={hasSecret ? "Enter a replacement token" : "Required"}
            value={form.accessToken}
            onChange={(event) => update("accessToken", event.target.value)}
          />
        </Field>
        {form.provider !== "GOOGLE_ADS" && (
          <Field label="Test event code">
            <Input
              placeholder="Optional"
              value={form.testEventCode}
              onChange={(event) => update("testEventCode", event.target.value)}
            />
          </Field>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 border-y py-4">
        <div>
          <Label htmlFor={`inherit-${form.provider}`}>Share with locations</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Location accounts override this organization account.
          </p>
        </div>
        <Switch
          id={`inherit-${form.provider}`}
          checked={form.inheritToLocations}
          onCheckedChange={(checked) => update("inheritToLocations", checked)}
        />
      </div>

      <Button
        onClick={onSave}
        disabled={!form.displayName.trim() || !hasProviderConfig || !hasCredentials || pending}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {hasLocalAccount ? "Save account" : "Connect account"}
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
