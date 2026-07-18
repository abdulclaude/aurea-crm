"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, PhoneCall, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useTRPC } from "@/trpc/client";
import { VoiceNumberProvisioning } from "./voice-number-provisioning";
import { VoiceCallHistory } from "./voice-call-history";
import { ComplianceRegistrationForm } from "./compliance-registration-form";

type VoiceForm = {
  forwarding: string;
  countries: string;
  monthlyLimit: string;
  maxDuration: string;
  voicemail: boolean;
  recording: boolean;
  retention: string;
  legalAcknowledged: boolean;
};

const EMPTY: VoiceForm = {
  forwarding: "",
  countries: "",
  monthlyLimit: "",
  maxDuration: "",
  voicemail: false,
  recording: false,
  retention: "",
  legalAcknowledged: false,
};

export function ManagedVoiceSettings() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const overview = useQuery(trpc.communications.overview.queryOptions());
  const [form, setForm] = useState<VoiceForm>(EMPTY);
  const [code, setCode] = useState("");
  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.communications.overview.queryKey(),
    });
  useEffect(() => {
    const profile = overview.data?.profile;
    if (!profile) return;
    setForm({
      forwarding: profile.voiceForwardingNumber ?? "",
      countries: profile.allowedVoiceCountries.join(", "),
      monthlyLimit: profile.voiceMonthlySpendLimit ?? "",
      maxDuration: profile.voiceMaxCallDurationSeconds?.toString() ?? "",
      voicemail: profile.voicemailEnabled,
      recording: profile.recordingEnabled,
      retention: profile.recordingRetentionDays?.toString() ?? "",
      legalAcknowledged: Boolean(profile.recordingLegalAcknowledgedAt),
    });
  }, [overview.data?.profile]);
  const update = useMutation(
    trpc.communications.updateProfile.mutationOptions({
      onSuccess: async () => {
        toast.success("Voice policy saved");
        await refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const requestCode = useMutation(
    trpc.communications.requestForwardingVerification.mutationOptions({
      onSuccess: () => toast.success("Verification call placed"),
      onError: (error) => toast.error(error.message),
    }),
  );
  const confirmCode = useMutation(
    trpc.communications.confirmForwardingVerification.mutationOptions({
      onSuccess: async () => {
        setCode("");
        toast.success("Forwarding number verified");
        await refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  if (overview.isLoading)
    return (
      <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
        Loading voice settings
      </p>
    );
  if (overview.isError || !overview.data)
    return (
      <Alert variant="destructive">
        <AlertTitle>Voice settings could not be loaded</AlertTitle>
        <AlertDescription>
          Refresh the page or contact support if the problem continues.
        </AlertDescription>
      </Alert>
    );
  const profile = overview.data.profile;
  const countries = form.countries
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  const errors = {
    forwarding:
      form.forwarding && !/^\+[1-9]\d{7,14}$/.test(form.forwarding)
        ? "Enter a valid E.164 phone number."
        : null,
    countries: countries.some((country) => !/^[A-Z]{2}$/.test(country))
      ? "Use two-letter country codes separated by commas."
      : null,
    monthlyLimit:
      form.monthlyLimit && !/^\d+(?:\.\d{1,4})?$/.test(form.monthlyLimit)
        ? "Enter a non-negative amount with up to four decimals."
        : null,
    maxDuration:
      form.maxDuration &&
      (!/^\d+$/.test(form.maxDuration) || Number(form.maxDuration) < 1)
        ? "Enter a positive number of seconds."
        : null,
    retention:
      form.recording &&
      (!/^\d+$/.test(form.retention) || Number(form.retention) < 1)
        ? "Enter a positive retention period."
        : null,
  };
  const invalid = Object.values(errors).some(Boolean);
  const save = () =>
    update.mutate({
      fallbackEmailEnabled: profile.fallbackEmailEnabled,
      spendCurrency: profile.spendCurrency,
      smsMonthlySpendLimit: profile.smsMonthlySpendLimit,
      voiceMonthlySpendLimit: form.monthlyLimit || null,
      voiceMaxCallDurationSeconds: form.maxDuration
        ? Number.parseInt(form.maxDuration, 10)
        : null,
      numberReleaseGraceDays: profile.numberReleaseGraceDays,
      allowedSmsCountries: profile.allowedSmsCountries,
      allowedVoiceCountries: countries,
      voiceForwardingNumber: form.forwarding || null,
      voicemailEnabled: form.voicemail,
      recordingEnabled: form.recording,
      recordingRetentionDays: form.retention
        ? Number.parseInt(form.retention, 10)
        : null,
      recordingLegalAcknowledged: form.legalAcknowledged,
    });
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium">Managed voice</h2>
        <Badge variant="outline" className="gap-1">
          <ShieldCheck className="size-3" />
          Aurea managed
        </Badge>
      </div>
      <Separator />
      <VoiceNumberProvisioning entitled={Boolean(profile.voiceEntitledAt)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="voice-forwarding"
          label="Staff forwarding number"
          error={errors.forwarding}
        >
          <Input
            id="voice-forwarding"
            aria-invalid={Boolean(errors.forwarding)}
            aria-describedby={
              errors.forwarding ? "voice-forwarding-error" : undefined
            }
            value={form.forwarding}
            placeholder="+442071234567"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                forwarding: event.target.value,
              }))
            }
          />
        </Field>
        <Field
          id="voice-countries"
          label="Allowed countries"
          error={errors.countries}
        >
          <Input
            id="voice-countries"
            aria-invalid={Boolean(errors.countries)}
            aria-describedby={
              errors.countries ? "voice-countries-error" : undefined
            }
            value={form.countries}
            placeholder="GB, US"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                countries: event.target.value,
              }))
            }
          />
        </Field>
        <Field
          id="voice-monthly-limit"
          label="Monthly spend limit"
          error={errors.monthlyLimit}
        >
          <Input
            id="voice-monthly-limit"
            aria-invalid={Boolean(errors.monthlyLimit)}
            aria-describedby={
              errors.monthlyLimit ? "voice-monthly-limit-error" : undefined
            }
            inputMode="decimal"
            value={form.monthlyLimit}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                monthlyLimit: event.target.value,
              }))
            }
          />
        </Field>
        <Field
          id="voice-max-duration"
          label="Maximum call duration (seconds)"
          error={errors.maxDuration}
        >
          <Input
            id="voice-max-duration"
            aria-invalid={Boolean(errors.maxDuration)}
            aria-describedby={
              errors.maxDuration ? "voice-max-duration-error" : undefined
            }
            inputMode="numeric"
            value={form.maxDuration}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                maxDuration: event.target.value,
              }))
            }
          />
        </Field>
      </div>
      <Toggle
        id="voice-voicemail"
        label="Voicemail"
        checked={form.voicemail}
        onChange={(checked) =>
          setForm((current) => ({ ...current, voicemail: checked }))
        }
      />
      <Toggle
        id="voice-recording"
        label="Call recording"
        checked={form.recording}
        onChange={(checked) =>
          setForm((current) => ({ ...current, recording: checked }))
        }
      />
      {form.recording ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="voice-retention"
            label="Recording retention (days)"
            error={errors.retention}
          >
            <Input
              id="voice-retention"
              aria-invalid={Boolean(errors.retention)}
              aria-describedby={
                errors.retention ? "voice-retention-error" : undefined
              }
              inputMode="numeric"
              value={form.retention}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  retention: event.target.value,
                }))
              }
            />
          </Field>
          <Toggle
            id="voice-legal-acknowledgement"
            label="Legal acknowledgement"
            checked={form.legalAcknowledged}
            onChange={(checked) =>
              setForm((current) => ({ ...current, legalAcknowledged: checked }))
            }
          />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={update.isPending || invalid}>
          Save policy
        </Button>
        <Button
          variant="outline"
          onClick={() => requestCode.mutate()}
          disabled={
            requestCode.isPending ||
            !form.forwarding ||
            Boolean(errors.forwarding)
          }
        >
          <PhoneCall />
          Verify number
        </Button>
        {profile.voiceForwardingNumberVerifiedAt ? (
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="size-3 text-emerald-500" />
            Verified
          </Badge>
        ) : null}
      </div>
      {!profile.voiceForwardingNumberVerifiedAt ? (
        <div className="flex max-w-xs gap-2">
          <Input
            aria-label="Verification code"
            value={code}
            maxLength={6}
            onChange={(event) => setCode(event.target.value)}
          />
          <Button
            variant="outline"
            disabled={code.length !== 6 || confirmCode.isPending}
            onClick={() => confirmCode.mutate({ code })}
          >
            {confirmCode.isPending ? (
              <Loader2 className="animate-spin" />
            ) : null}
            Confirm
          </Button>
        </div>
      ) : null}
      <VoiceCallHistory />
      <ComplianceRegistrationForm channel="VOICE" />
    </div>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b py-3">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
