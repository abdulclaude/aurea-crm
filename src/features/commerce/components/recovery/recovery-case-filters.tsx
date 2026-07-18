"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  recoveryCaseStatuses,
  recoveryCaseStatusSchema,
  recoveryTargetSchema,
  recoveryTargets,
} from "@/features/commerce/recovery-contracts";

import type { RecoveryOwner } from "./recovery-ui-types";

export type RecoveryStatusFilter =
  | "ACTIVE"
  | "ALL"
  | (typeof recoveryCaseStatuses)[number];
export type RecoveryTargetFilter = "ALL" | (typeof recoveryTargets)[number];

export function RecoveryCaseFilters(props: {
  search: string;
  status: RecoveryStatusFilter;
  target: RecoveryTargetFilter;
  ownerUserId: string;
  owners: RecoveryOwner[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: RecoveryStatusFilter) => void;
  onTargetChange: (value: RecoveryTargetFilter) => void;
  onOwnerChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 p-4 sm:flex-row sm:px-8">
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search recovery cases"
          className="pl-9"
          placeholder="Search member, email, or provider reference"
          value={props.search}
          onChange={(event) => props.onSearchChange(event.target.value)}
        />
      </div>
      <Select
        value={props.status}
        onValueChange={(value) => {
          if (value === "ACTIVE") {
            props.onStatusChange("ACTIVE");
            return;
          }
          if (value === "ALL") {
            props.onStatusChange("ALL");
            return;
          }
          const parsed = recoveryCaseStatusSchema.safeParse(value);
          if (parsed.success) props.onStatusChange(parsed.data);
        }}
      >
        <SelectTrigger className="w-full shadow-none sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="ALL">All statuses</SelectItem>
          {recoveryCaseStatuses.map((status) => (
            <SelectItem key={status} value={status}>
              {status.replaceAll("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={props.target}
        onValueChange={(value) => {
          if (value === "ALL") return props.onTargetChange("ALL");
          const parsed = recoveryTargetSchema.safeParse(value);
          if (parsed.success) props.onTargetChange(parsed.data);
        }}
      >
        <SelectTrigger className="w-full shadow-none sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All targets</SelectItem>
          {recoveryTargets.map((target) => (
            <SelectItem key={target} value={target}>
              {target.toLowerCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={props.ownerUserId} onValueChange={props.onOwnerChange}>
        <SelectTrigger className="w-full shadow-none sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All owners</SelectItem>
          <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
          {props.owners.map((owner) => (
            <SelectItem key={owner.id} value={owner.id}>
              {owner.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
