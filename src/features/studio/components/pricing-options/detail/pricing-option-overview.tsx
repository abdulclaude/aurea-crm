import { format } from "date-fns";

import { Separator } from "@/components/ui/separator";

import type { PricingOptionDetail } from "./types";

export function PricingOptionOverview({
  option,
}: {
  option: PricingOptionDetail;
}) {
  return (
    <div>
      <Section title="Pricing">
        <DetailRow label="Price" value={money(option.price, option.currency)} />
        <DetailRow
          label="Billing"
          value={formatLabel(option.billingInterval)}
        />
        <DetailRow label="Type" value={formatLabel(option.type)} />
        <DetailRow
          label="Revenue category"
          value={option.revenueCategory ?? "Not set"}
        />
      </Section>
      <Section title="Usage">
        <DetailRow
          label="Class credits"
          value={option.classCredits?.toString() ?? "Unlimited"}
        />
        <DetailRow
          label="Valid for"
          value={
            option.durationDays ? `${option.durationDays} days` : "No expiry"
          }
        />
        <DetailRow
          label="Maximum purchases"
          value={option.maxPurchases?.toString() ?? "No overall limit"}
        />
        <DetailRow
          label="Per member"
          value={option.maxPurchasesPerClient?.toString() ?? "No member limit"}
        />
      </Section>
      <Section title="Customer experience">
        <DetailRow
          label="Description"
          value={option.description ?? "No description"}
        />
        <DetailRow
          label="Access summary"
          value={option.accessSummary ?? "Uses the access rules tab"}
        />
        <DetailRow
          label="Confirmation redirect"
          value={option.confirmationRedirectUrl ?? "Default confirmation"}
        />
        <DetailRow
          label="Last updated"
          value={format(option.updatedAt, "d MMM yyyy, HH:mm")}
        />
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="px-6 py-4">
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      <Separator />
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 px-6 py-3 sm:grid-cols-[180px_minmax(0,1fr)]">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-sm">{value}</span>
    </div>
  );
}

function money(value: string, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(Number(value));
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
