import type { ReactElement } from "react";

import { Badge } from "@/components/ui/badge";
import {
  PRICING_TYPES,
  type PricingType,
} from "./pricing-option-create-constants";

const PRICING_TYPE_COLORS: Record<PricingType, string> = {
  CLASS_PACK: "#2563eb",
  MEMBERSHIP: "#7c3aed",
  BUNDLE: "#c2410c",
  DROP_IN: "#0891b2",
  INTRO_OFFER: "#db2777",
  ACCOUNT_CREDIT: "#0f766e",
};

function badgeStyle(color: string) {
  return {
    backgroundColor: `${color}18`,
    borderColor: `${color}66`,
    color,
    boxShadow: `0 0 0 1px ${color}66`,
  };
}

export function getPricingTypeColor(type: PricingType): string {
  return PRICING_TYPE_COLORS[type];
}

export function PricingOptionStatusBadge({
  active,
}: {
  active: boolean;
}): ReactElement {
  const color = active ? "#16a34a" : "#64748b";
  return (
    <Badge
      variant="outline"
      className="text-[10px] ring-0"
      style={badgeStyle(color)}
    >
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

export function PricingOptionTypeBadge({
  type,
}: {
  type: PricingType;
}): ReactElement {
  const label = PRICING_TYPES.find((option) => option.value === type)?.label ?? type;
  return (
    <Badge
      variant="outline"
      className="max-w-44 truncate text-[10px] ring-0"
      style={badgeStyle(PRICING_TYPE_COLORS[type])}
    >
      {label}
    </Badge>
  );
}

export function PricingOptionCheckoutBadge({
  type,
  membershipPlanId,
  stripePriceId,
}: {
  type: PricingType;
  membershipPlanId: string | null;
  stripePriceId: string | null;
}): ReactElement {
  const isAccountCredit = type === "ACCOUNT_CREDIT";
  const isCheckoutBacked = Boolean(membershipPlanId);
  const isStripeSynced = Boolean(stripePriceId);
  const color =
    isAccountCredit || isStripeSynced
      ? "#16a34a"
      : isCheckoutBacked
        ? "#d97706"
        : "#64748b";
  const label = isAccountCredit
    ? "Direct checkout"
    : isStripeSynced
      ? "Synced"
      : isCheckoutBacked
        ? "Needs sync"
        : "Not checkout-backed";

  return (
    <Badge
      variant="outline"
      className="text-[10px] ring-0"
      style={badgeStyle(color)}
    >
      {label}
    </Badge>
  );
}
