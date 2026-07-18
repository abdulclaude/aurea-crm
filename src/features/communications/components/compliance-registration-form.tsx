"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { useTRPC } from "@/trpc/client";

export function ComplianceRegistrationForm({
  channel,
}: {
  channel: "SMS" | "VOICE";
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const overview = useQuery(trpc.communications.overview.queryOptions());
  const [country, setCountry] = useState("GB");
  const [programType, setProgramType] = useState("business");
  const [numberType, setNumberType] = useState<"local" | "mobile" | "tollFree">(
    "local",
  );
  const [addressSid, setAddressSid] = useState("");
  const [bundleSid, setBundleSid] = useState("");
  const [messagingServiceSid, setMessagingServiceSid] = useState("");
  const [campaignSid, setCampaignSid] = useState("");
  const save = useMutation(
    trpc.communications.saveComplianceRegistration.mutationOptions({
      onSuccess: async () => {
        toast.success("Compliance verification queued");
        await queryClient.invalidateQueries({
          queryKey: trpc.communications.overview.queryKey(),
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const registrations =
    overview.data?.compliance.filter(
      (item) => item.channel === channel || item.channel === "BOTH",
    ) ?? [];
  const prefix = `compliance-${channel.toLowerCase()}`;
  return (
    <div className="space-y-4 border-t pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Compliance registrations</h3>
        <div aria-label="Registration statuses" className="flex flex-wrap gap-2">
          {registrations.map((item) => (
            <Badge key={item.id} variant="outline" className="capitalize">
              {item.country} · {item.status.toLowerCase()}
            </Badge>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id={`${prefix}-country`} label="Country">
          <Input
            id={`${prefix}-country`}
            value={country}
            maxLength={2}
            onChange={(event) => setCountry(event.target.value.toUpperCase())}
          />
        </Field>
        <Field id={`${prefix}-program`} label="Program">
          <Input
            id={`${prefix}-program`}
            value={programType}
            onChange={(event) => setProgramType(event.target.value)}
          />
        </Field>
        <Field id={`${prefix}-number-type`} label="Number type">
          <Select
            value={numberType}
            onValueChange={(value) => setNumberType(value as typeof numberType)}
          >
            <SelectTrigger id={`${prefix}-number-type`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local">Local</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
              <SelectItem value="tollFree">Toll-free</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field id={`${prefix}-address-sid`} label="Address SID">
          <Input
            id={`${prefix}-address-sid`}
            value={addressSid}
            onChange={(event) => setAddressSid(event.target.value)}
          />
        </Field>
        <Field id={`${prefix}-bundle-sid`} label="Bundle SID">
          <Input
            id={`${prefix}-bundle-sid`}
            value={bundleSid}
            onChange={(event) => setBundleSid(event.target.value)}
          />
        </Field>
        {channel === "SMS" ? (
          <>
            <Field
              id={`${prefix}-messaging-service-sid`}
              label="Messaging service SID"
            >
              <Input
                id={`${prefix}-messaging-service-sid`}
                value={messagingServiceSid}
                onChange={(event) => setMessagingServiceSid(event.target.value)}
              />
            </Field>
            <Field id={`${prefix}-campaign-sid`} label="Campaign SID">
              <Input
                id={`${prefix}-campaign-sid`}
                value={campaignSid}
                onChange={(event) => setCampaignSid(event.target.value)}
              />
            </Field>
          </>
        ) : null}
      </div>
      <Button
        variant="outline"
        disabled={save.isPending}
        onClick={() =>
          save.mutate({
            country,
            channel,
            programType,
            numberType,
            addressSid: addressSid || null,
            bundleSid: bundleSid || null,
            identitySid: null,
            messagingServiceSid: messagingServiceSid || null,
            campaignSid: campaignSid || null,
          })
        }
      >
        Verify provider registration
      </Button>
    </div>
  );
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
