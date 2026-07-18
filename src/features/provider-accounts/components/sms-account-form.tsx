"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { SmsProvider } from "@/features/provider-accounts/contracts";

export type SmsAccountFormState = {
  provider: SmsProvider;
  displayName: string;
  accountIdentifier: string;
  secret: string;
  fromNumber: string;
  monthlyLimit: number;
  inheritToLocations: boolean;
};

export const EMPTY_SMS_ACCOUNT_FORM: SmsAccountFormState = {
  provider: "TWILIO",
  displayName: "Twilio",
  accountIdentifier: "",
  secret: "",
  fromNumber: "",
  monthlyLimit: 5000,
  inheritToLocations: true,
};

type SmsAccountFormProps = {
  hasLocalAccount: boolean;
  form: SmsAccountFormState;
  pending: boolean;
  onChange: (form: SmsAccountFormState) => void;
  onSave: () => void;
};

const PROVIDER_LABELS: Record<SmsProvider, string> = {
  TWILIO: "Twilio",
  VONAGE: "Vonage",
  MESSAGEBIRD: "MessageBird",
};

export function SmsAccountForm({
  hasLocalAccount,
  form,
  pending,
  onChange,
  onSave,
}: SmsAccountFormProps) {
  const update = <K extends keyof SmsAccountFormState>(
    key: K,
    value: SmsAccountFormState[K],
  ) => onChange({ ...form, [key]: value });
  const needsIdentifier = form.provider !== "MESSAGEBIRD";
  const canSave = Boolean(
    form.displayName.trim() &&
      form.fromNumber.trim() &&
      (!needsIdentifier || form.accountIdentifier.trim()) &&
      (hasLocalAccount || form.secret.trim()) &&
      Number.isInteger(form.monthlyLimit) &&
      form.monthlyLimit >= 100 &&
      form.monthlyLimit <= 1_000_000,
  );
  const identifierLabel =
    form.provider === "TWILIO" ? "Account SID" : "API key";
  const missingFields = [
    !form.displayName.trim() ? "account name" : null,
    needsIdentifier && !form.accountIdentifier.trim() ? identifierLabel : null,
    !hasLocalAccount && !form.secret.trim()
      ? form.provider === "TWILIO"
        ? "auth token"
        : "API secret"
      : null,
    !form.fromNumber.trim() ? "sender number or ID" : null,
    !Number.isInteger(form.monthlyLimit) ||
    form.monthlyLimit < 100 ||
    form.monthlyLimit > 1_000_000
      ? "monthly message limit between 100 and 1,000,000"
      : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="sms-provider" label="Provider" required>
          <Select
            value={form.provider}
            onValueChange={(value: SmsProvider) => {
              onChange({
                ...form,
                provider: value,
                displayName: PROVIDER_LABELS[value],
                accountIdentifier: "",
                secret: "",
              });
            }}
          >
            <SelectTrigger id="sms-provider" aria-required="true">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="sms-account-name" label="Account name" required>
          <Input
            id="sms-account-name"
            required
            value={form.displayName}
            onChange={(event) => update("displayName", event.target.value)}
          />
        </Field>
        {needsIdentifier && (
          <Field id="sms-account-identifier" label={identifierLabel} required>
            <Input
              id="sms-account-identifier"
              required
              value={form.accountIdentifier}
              onChange={(event) =>
                update("accountIdentifier", event.target.value)
              }
            />
          </Field>
        )}
        <Field
          id="sms-account-secret"
          label={form.provider === "TWILIO" ? "Auth token" : "API secret"}
          required={!hasLocalAccount}
        >
          <Input
            id="sms-account-secret"
            type="password"
            required={!hasLocalAccount}
            autoComplete="new-password"
            value={form.secret}
            placeholder={
              hasLocalAccount ? "Enter a replacement secret" : "Required"
            }
            onChange={(event) => update("secret", event.target.value)}
          />
        </Field>
        <Field id="sms-sender" label="Sender number or ID" required>
          <Input
            id="sms-sender"
            required
            value={form.fromNumber}
            placeholder="+442012345678"
            onChange={(event) => update("fromNumber", event.target.value)}
          />
        </Field>
        <Field id="sms-monthly-limit" label="Monthly message limit" required>
          <Input
            id="sms-monthly-limit"
            type="number"
            required
            min={100}
            max={1_000_000}
            value={form.monthlyLimit}
            onChange={(event) =>
              update("monthlyLimit", Number(event.target.value))
            }
          />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-4 border-y py-4">
        <div>
          <Label htmlFor="inherit-sms">Share with locations</Label>
          <p id="inherit-sms-description" className="mt-1 text-xs text-muted-foreground">
            Location-specific SMS accounts override the organization account.
          </p>
        </div>
        <Switch
          id="inherit-sms"
          aria-describedby="inherit-sms-description"
          checked={form.inheritToLocations}
          onCheckedChange={(checked) => update("inheritToLocations", checked)}
        />
      </div>

      {missingFields.length > 0 ? (
        <p id="sms-save-requirements" className="text-xs text-muted-foreground">
          Required: {missingFields.join(", ")}.
        </p>
      ) : null}
      <Button
        onClick={onSave}
        disabled={!canSave || pending}
        aria-describedby={missingFields.length > 0 ? "sms-save-requirements" : undefined}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {hasLocalAccount ? "Save SMS account" : "Connect SMS account"}
      </Button>
    </>
  );
}

function Field({
  id,
  label,
  required = false,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}
