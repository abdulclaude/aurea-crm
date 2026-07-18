"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/client";

export function SmsPolicySettings() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const overview = useQuery(trpc.communications.overview.queryOptions());
  const [countries, setCountries] = useState("");
  const [limit, setLimit] = useState("");
  const [graceDays, setGraceDays] = useState("");
  const profile = overview.data?.profile;
  useEffect(() => {
    if (!profile) return;
    setCountries(profile.allowedSmsCountries.join(", "));
    setLimit(profile.smsMonthlySpendLimit ?? "");
    setGraceDays(profile.numberReleaseGraceDays?.toString() ?? "");
  }, [profile]);
  const update = useMutation(
    trpc.communications.updateProfile.mutationOptions({
      onSuccess: async () => {
        toast.success("Text messaging policy saved");
        await queryClient.invalidateQueries({
          queryKey: trpc.communications.overview.queryKey(),
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  if (!profile) return null;
  const normalizedCountries = countries
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  const countryError = normalizedCountries.some(
    (value) => !/^[A-Z]{2}$/.test(value),
  )
    ? "Use two-letter country codes separated by commas."
    : null;
  const limitError =
    limit && !/^\d+(?:\.\d{1,4})?$/.test(limit)
      ? "Enter a positive amount with up to four decimal places."
      : null;
  const graceNumber = graceDays ? Number(graceDays) : null;
  const graceError =
    graceNumber !== null &&
    (!Number.isInteger(graceNumber) || graceNumber < 0 || graceNumber > 365)
      ? "Enter a whole number from 0 to 365."
      : null;
  const hasErrors = Boolean(countryError || limitError || graceError);
  const save = () =>
    update.mutate({
      fallbackEmailEnabled: profile.fallbackEmailEnabled,
      spendCurrency: profile.spendCurrency,
      smsMonthlySpendLimit: limit || null,
      voiceMonthlySpendLimit: profile.voiceMonthlySpendLimit,
      voiceMaxCallDurationSeconds: profile.voiceMaxCallDurationSeconds,
      numberReleaseGraceDays: graceDays ? Number.parseInt(graceDays, 10) : null,
      allowedSmsCountries: normalizedCountries,
      allowedVoiceCountries: profile.allowedVoiceCountries,
      voiceForwardingNumber: profile.voiceForwardingNumber,
      voicemailEnabled: profile.voicemailEnabled,
      recordingEnabled: profile.recordingEnabled,
      recordingRetentionDays: profile.recordingRetentionDays,
      recordingLegalAcknowledged: Boolean(profile.recordingLegalAcknowledgedAt),
    });
  return (
    <div className="grid gap-4 border-t pt-5 sm:grid-cols-3">
      <Field id="sms-allowed-countries" label="Allowed countries">
        <Input
          id="sms-allowed-countries"
          value={countries}
          placeholder="GB, US"
          aria-invalid={Boolean(countryError)}
          aria-describedby={countryError ? "sms-allowed-countries-error" : undefined}
          onChange={(event) => setCountries(event.target.value)}
        />
        {countryError ? <ErrorText id="sms-allowed-countries-error">{countryError}</ErrorText> : null}
      </Field>
      <Field id="sms-monthly-limit" label="Monthly spend limit">
        <Input
          id="sms-monthly-limit"
          inputMode="decimal"
          value={limit}
          aria-invalid={Boolean(limitError)}
          aria-describedby={limitError ? "sms-monthly-limit-error" : undefined}
          onChange={(event) => setLimit(event.target.value)}
        />
        {limitError ? <ErrorText id="sms-monthly-limit-error">{limitError}</ErrorText> : null}
      </Field>
      <Field id="sms-release-grace" label="Release grace (days)">
        <Input
          id="sms-release-grace"
          inputMode="numeric"
          value={graceDays}
          aria-invalid={Boolean(graceError)}
          aria-describedby={graceError ? "sms-release-grace-error" : undefined}
          onChange={(event) => setGraceDays(event.target.value)}
        />
        {graceError ? <ErrorText id="sms-release-grace-error">{graceError}</ErrorText> : null}
      </Field>
      <Button
        className="sm:col-span-3 sm:w-fit"
        onClick={save}
        disabled={update.isPending || hasErrors}
      >
        Save policy
      </Button>
    </div>
  );
}

function ErrorText({ id, children }: { id: string; children: React.ReactNode }) {
  return <p id={id} className="text-xs text-destructive">{children}</p>;
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
