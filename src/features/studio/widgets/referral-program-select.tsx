"use client";

import type { JSX } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ReferralProgramOption = {
  id: string;
  name: string;
  referrerRewardType: string;
  refereeRewardType: string;
};

export function ReferralProgramSelect({
  id,
  value,
  options,
  loading,
  onChange,
}: {
  id: string;
  value: string;
  options: ReferralProgramOption[];
  loading: boolean;
  onChange: (programId: string) => void;
}): JSX.Element {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id} className="shadow-none">
        <SelectValue
          placeholder={loading ? "Loading referral program..." : "Select a referral program"}
        />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
