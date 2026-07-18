import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export type ResendAccountFormState = {
  displayName: string;
  apiKey: string;
  webhookSecret: string;
  defaultFromEmail: string;
  defaultFromName: string;
  defaultReplyTo: string;
  inheritToLocations: boolean;
};

export const EMPTY_RESEND_ACCOUNT_FORM: ResendAccountFormState = {
  displayName: "Resend",
  apiKey: "",
  webhookSecret: "",
  defaultFromEmail: "",
  defaultFromName: "",
  defaultReplyTo: "",
  inheritToLocations: true,
};

type ResendAccountFormProps = {
  accountId: string | null;
  hasSecret: boolean;
  hasWebhookSecret: boolean;
  form: ResendAccountFormState;
  pending: boolean;
  onChange: (form: ResendAccountFormState) => void;
  onSave: () => void;
};

export function ResendAccountForm({
  accountId,
  hasSecret,
  hasWebhookSecret,
  form,
  pending,
  onChange,
  onSave,
}: ResendAccountFormProps) {
  const update = <K extends keyof ResendAccountFormState>(
    key: K,
    value: ResendAccountFormState[K],
  ) => onChange({ ...form, [key]: value });
  const canSave = Boolean(
    form.displayName.trim() &&
      (accountId || (form.apiKey.trim() && form.webhookSecret.trim())) &&
      form.defaultFromEmail.trim() &&
      form.defaultFromName.trim(),
  );
  const missingFields = [
    !form.displayName.trim() ? "account name" : null,
    !form.defaultFromName.trim() ? "default from name" : null,
    !accountId && !form.apiKey.trim() ? "API key" : null,
    !accountId && !form.webhookSecret.trim() ? "webhook signing secret" : null,
    !form.defaultFromEmail.trim() ? "default from email" : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="resend-account-name" label="Account name" required>
          <Input
            id="resend-account-name"
            required
            value={form.displayName}
            onChange={(event) => update("displayName", event.target.value)}
          />
        </Field>
        <Field id="resend-from-name" label="Default from name" required>
          <Input
            id="resend-from-name"
            required
            value={form.defaultFromName}
            onChange={(event) => update("defaultFromName", event.target.value)}
          />
        </Field>
        <Field id="resend-api-key" label="API key" required={!accountId}>
          <Input
            id="resend-api-key"
            type="password"
            required={!accountId}
            autoComplete="new-password"
            value={form.apiKey}
            placeholder={hasSecret ? "Enter a replacement key" : "re_..."}
            onChange={(event) => update("apiKey", event.target.value)}
          />
        </Field>
        <Field
          id="resend-webhook-secret"
          label="Webhook signing secret"
          required={!accountId}
        >
          <Input
            id="resend-webhook-secret"
            type="password"
            required={!accountId}
            autoComplete="new-password"
            value={form.webhookSecret}
            placeholder={
              hasWebhookSecret ? "Enter a replacement secret" : "whsec_..."
            }
            onChange={(event) => update("webhookSecret", event.target.value)}
          />
        </Field>
        <Field id="resend-from-email" label="Default from email" required>
          <Input
            id="resend-from-email"
            type="email"
            required
            value={form.defaultFromEmail}
            placeholder="hello@example.com"
            onChange={(event) => update("defaultFromEmail", event.target.value)}
          />
        </Field>
        <Field id="resend-reply-to" label="Default reply-to">
          <Input
            id="resend-reply-to"
            type="email"
            value={form.defaultReplyTo}
            placeholder="support@example.com"
            onChange={(event) => update("defaultReplyTo", event.target.value)}
          />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-4 border-y py-4">
        <div>
          <Label htmlFor="inherit-resend">Share with locations</Label>
          <p id="inherit-resend-description" className="mt-1 text-xs text-muted-foreground">
            Location-specific accounts override the organization account.
          </p>
        </div>
        <Switch
          id="inherit-resend"
          aria-describedby="inherit-resend-description"
          checked={form.inheritToLocations}
          onCheckedChange={(checked) => update("inheritToLocations", checked)}
        />
      </div>

      {accountId && (
        <Field id="resend-webhook-endpoint" label="Webhook endpoint">
          <Input
            id="resend-webhook-endpoint"
            readOnly
            value={`/api/webhooks/resend/${accountId}`}
            aria-label="Resend webhook endpoint"
          />
        </Field>
      )}

      {missingFields.length > 0 ? (
        <p id="resend-save-requirements" className="text-xs text-muted-foreground">
          Required: {missingFields.join(", ")}.
        </p>
      ) : null}
      <Button
        onClick={onSave}
        disabled={!canSave || pending}
        aria-describedby={missingFields.length > 0 ? "resend-save-requirements" : undefined}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {accountId ? "Save account settings" : "Save Resend account"}
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
