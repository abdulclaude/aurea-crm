import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import type { PricingOptionDetail } from "./types";

export function PricingOptionAccess({
  option,
}: {
  option: PricingOptionDetail;
}) {
  return (
    <div>
      <div className="px-6 py-4">
        <h2 className="text-sm font-medium">What this option unlocks</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Access is evaluated against the service and reporting type on each
          scheduled class.
        </p>
      </div>
      <Separator />
      {option.grants.length ? (
        <div className="divide-y divide-border">
          {option.grants.map((grant) => (
            <div
              key={grant.id}
              className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">{grantName(grant)}</p>
                <p className="text-xs text-muted-foreground">{limits(grant)}</p>
              </div>
              <Badge variant="secondary">{label(grant.targetType)}</Badge>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-6 py-10 text-sm text-muted-foreground">
          No access rules are configured.
        </p>
      )}
    </div>
  );
}

type Grant = PricingOptionDetail["grants"][number];
function grantName(grant: Grant) {
  if (grant.targetType === "ALL_SERVICES") return "All services";
  return (
    grant.serviceTypeName ??
    grant.serviceCategoryName ??
    grant.classTypeName ??
    grant.targetKey ??
    "Unavailable resource"
  );
}
function label(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
function limits(grant: Grant) {
  const values = [
    grant.visitLimit ? `${grant.visitLimit} visits` : null,
    grant.bookingLimitPerDay ? `${grant.bookingLimitPerDay}/day` : null,
    grant.bookingLimitPerWeek ? `${grant.bookingLimitPerWeek}/week` : null,
    grant.bookingLimitPerMonth ? `${grant.bookingLimitPerMonth}/month` : null,
  ].filter(Boolean);
  return values.length ? values.join(" · ") : "No additional booking limits";
}
