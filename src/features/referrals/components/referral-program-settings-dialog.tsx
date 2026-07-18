"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AppRouter } from "@/trpc/routers/_app";

type Program = NonNullable<inferRouterOutputs<AppRouter>["referrals"]["getProgram"]>;
type RewardType = Program["referrerRewardType"];

export type ReferralProgramSettingsInput = {
  name: string;
  referrerRewardType: RewardType;
  referrerRewardValue: number;
  refereeRewardType: RewardType;
  refereeRewardValue: number;
  refereeOfferDays: number;
  currency: string;
  maxReferralsPerMember: number | null;
};

const rewardTypes: Array<{ value: RewardType; label: string }> = [
  { value: "CREDIT", label: "Account credit" },
  { value: "DISCOUNT", label: "Discount" },
  { value: "FREE_CLASS", label: "Free class" },
  { value: "CASH", label: "Cash" },
];

type Props = {
  open: boolean;
  program: Program;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: ReferralProgramSettingsInput) => void;
};

export function ReferralProgramSettingsDialog({
  open,
  program,
  pending,
  onOpenChange,
  onSave,
}: Props) {
  const [name, setName] = useState(program.name);
  const [referrerType, setReferrerType] = useState(program.referrerRewardType);
  const [referrerValue, setReferrerValue] = useState(program.referrerRewardValue);
  const [refereeType, setRefereeType] = useState(program.refereeRewardType);
  const [refereeValue, setRefereeValue] = useState(program.refereeRewardValue);
  const [offerDays, setOfferDays] = useState(String(program.refereeOfferDays));
  const [currency, setCurrency] = useState(program.currency);
  const [memberLimit, setMemberLimit] = useState(
    program.maxReferralsPerMember?.toString() ?? "",
  );

  useEffect(() => {
    if (!open) return;
    setName(program.name);
    setReferrerType(program.referrerRewardType);
    setReferrerValue(program.referrerRewardValue);
    setRefereeType(program.refereeRewardType);
    setRefereeValue(program.refereeRewardValue);
    setOfferDays(String(program.refereeOfferDays));
    setCurrency(program.currency);
    setMemberLimit(program.maxReferralsPerMember?.toString() ?? "");
  }, [open, program]);

  const canSave =
    name.trim().length > 0 &&
    Number(referrerValue) >= 0 &&
    Number(refereeValue) >= 0 &&
    Number(offerDays) >= 1 &&
    Number(offerDays) <= 90 &&
    /^[A-Za-z]{3}$/.test(currency) &&
    (memberLimit === "" || Number(memberLimit) >= 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Referral program settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="referral-program-name">Program name</Label>
            <Input id="referral-program-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <RewardFields
            label="Referrer reward"
            type={referrerType}
            value={referrerValue}
            onTypeChange={setReferrerType}
            onValueChange={setReferrerValue}
          />
          <RewardFields
            label="New client reward"
            type={refereeType}
            value={refereeValue}
            onTypeChange={setRefereeType}
            onValueChange={setRefereeValue}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="referral-currency">Currency</Label>
              <Input id="referral-currency" maxLength={3} value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referral-days">Offer days</Label>
              <Input id="referral-days" type="number" min={1} max={90} value={offerDays} onChange={(event) => setOfferDays(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referral-limit">Member limit</Label>
              <Input id="referral-limit" type="number" min={1} placeholder="No limit" value={memberLimit} onChange={(event) => setMemberLimit(event.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!canSave || pending}
            onClick={() => onSave({
              name: name.trim(),
              referrerRewardType: referrerType,
              referrerRewardValue: Number(referrerValue),
              refereeRewardType: refereeType,
              refereeRewardValue: Number(refereeValue),
              refereeOfferDays: Number(offerDays),
              currency,
              maxReferralsPerMember: memberLimit === "" ? null : Number(memberLimit),
            })}
          >
            Save settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RewardFields({
  label,
  type,
  value,
  onTypeChange,
  onValueChange,
}: {
  label: string;
  type: RewardType;
  value: string;
  onTypeChange: (value: RewardType) => void;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
        <Select value={type} onValueChange={(value) => onTypeChange(value as RewardType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {rewardTypes.map((rewardType) => (
              <SelectItem key={rewardType.value} value={rewardType.value}>{rewardType.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="number" min={0} step="0.01" value={value} onChange={(event) => onValueChange(event.target.value)} />
      </div>
    </div>
  );
}
