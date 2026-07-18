"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AudienceOptionGroup,
  type AudienceOption,
} from "@/features/audiences/components/audience-option-group";
import type { SavedAudienceDefinition } from "@/features/audiences/lib/audience-definition";

const MEMBERSHIP_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "PAUSED", label: "Paused" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "EXPIRED", label: "Expired" },
] satisfies AudienceOption[];

type MembershipStatus =
  SavedAudienceDefinition["membership"]["statuses"][number];

function isMembershipStatus(value: string): value is MembershipStatus {
  return ["ACTIVE", "INACTIVE", "PAUSED", "CANCELLED", "EXPIRED"].includes(
    value,
  );
}

type AudienceCommerceFieldsProps = {
  definition: SavedAudienceDefinition;
  membershipPlans: AudienceOption[];
  disabled: boolean;
  onChange: (definition: SavedAudienceDefinition) => void;
};

export function AudienceCommerceFields({
  definition,
  membershipPlans,
  disabled,
  onChange,
}: AudienceCommerceFieldsProps) {
  const spend = definition.commerce.minimumLifetimeSpend;

  return (
    <div className="space-y-5 border-t pt-5">
      <AudienceOptionGroup
        label="Membership status"
        options={MEMBERSHIP_STATUS_OPTIONS}
        value={definition.membership.statuses}
        disabled={disabled}
        onChange={(statuses) =>
          onChange({
            ...definition,
            membership: {
              ...definition.membership,
              statuses: statuses.filter(isMembershipStatus),
            },
          })
        }
      />
      {membershipPlans.length > 0 ? (
        <AudienceOptionGroup
          label="Membership plans"
          options={membershipPlans}
          value={definition.membership.planIds}
          disabled={disabled}
          onChange={(planIds) =>
            onChange({
              ...definition,
              membership: { ...definition.membership, planIds },
            })
          }
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Payment state</Label>
          <Select
            value={definition.commerce.paymentState}
            disabled={disabled}
            onValueChange={(
              paymentState: SavedAudienceDefinition["commerce"]["paymentState"],
            ) =>
              onChange({
                ...definition,
                commerce: { ...definition.commerce, paymentState },
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ANY">Any payment state</SelectItem>
              <SelectItem value="SUCCEEDED">Has paid</SelectItem>
              <SelectItem value="FAILED">Has failed payment</SelectItem>
              <SelectItem value="NEVER_PAID">Has never paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Minimum lifetime spend</Label>
          <div className="grid grid-cols-[1fr_88px] gap-2">
            <Input
              inputMode="decimal"
              value={spend?.amount ?? ""}
              disabled={disabled}
              placeholder="0.00"
              onChange={(event) =>
                onChange({
                  ...definition,
                  commerce: {
                    ...definition.commerce,
                    minimumLifetimeSpend: event.target.value
                      ? {
                          amount: event.target.value,
                          currency: spend?.currency ?? "GBP",
                        }
                      : null,
                  },
                })
              }
            />
            <Input
              value={spend?.currency ?? "GBP"}
              disabled={disabled || !spend}
              maxLength={3}
              aria-label="Spend currency"
              onChange={(event) =>
                spend
                  ? onChange({
                      ...definition,
                      commerce: {
                        ...definition.commerce,
                        minimumLifetimeSpend: {
                          ...spend,
                          currency: event.target.value.toUpperCase(),
                        },
                      },
                    })
                  : undefined
              }
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Email eligibility</Label>
        <Select
          value={definition.emailEligibility}
          disabled={disabled}
          onValueChange={(
            emailEligibility: SavedAudienceDefinition["emailEligibility"],
          ) => onChange({ ...definition, emailEligibility })}
        >
          <SelectTrigger className="w-full md:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ANY">Any email eligibility</SelectItem>
            <SelectItem value="ELIGIBLE">Emailable</SelectItem>
            <SelectItem value="SUPPRESSED">Suppressed</SelectItem>
            <SelectItem value="INVALID">Missing or invalid email</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
