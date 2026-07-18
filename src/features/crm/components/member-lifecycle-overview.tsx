"use client";

import { format, formatDistanceToNow } from "date-fns";

import type { LifecycleSummary } from "./member-lifecycle-types";
import { labelize } from "./member-lifecycle-types";
import { MemberStatusBadge } from "./member-status-badge";

export function OverviewView({ data }: { data: LifecycleSummary }) {
  const activeMembership = data.memberships.find(
    (membership) => membership.status === "ACTIVE",
  );
  const lastVisit = data.summary.lastVisit
    ? new Date(data.summary.lastVisit)
    : null;
  const churnRisk = data.summary.churnRisk;
  const metrics = [
    {
      label: "Visits",
      value: String(data.summary.visitCount),
      detail: "recorded attendances",
    },
    {
      label: "Current streak",
      value: String(data.summary.currentStreak),
      detail: data.summary.currentStreak === 1 ? "visit" : "visits",
    },
    {
      label: "Last visit",
      value: lastVisit
        ? formatDistanceToNow(lastVisit, { addSuffix: true })
        : "Never",
      detail: lastVisit ? format(lastVisit, "d MMM yyyy, HH:mm") : "No attendance yet",
    },
    {
      label: "Member since",
      value: format(new Date(data.client.createdAt), "MMM yyyy"),
      detail: format(new Date(data.client.createdAt), "d MMM yyyy"),
    },
    {
      label: "Membership",
      value: labelize(data.summary.membershipStatus),
      detail: activeMembership?.plan?.name ?? "No active pricing option",
    },
    {
      label: "Payment status",
      value: labelize(data.summary.paymentStatus),
      detail: `${data.payments.length} recent payment${data.payments.length === 1 ? "" : "s"}`,
    },
    {
      label: "Waiver status",
      value: labelize(data.summary.waiverStatus),
      detail: `${data.waivers.missing.length} missing required`,
    },
    {
      label: "Churn risk",
      value: churnRisk ? `${churnRisk.score}/100` : "Not scored",
      detail: churnRisk ? `${labelize(churnRisk.riskLevel)} risk` : "No risk score available",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <section className="overflow-hidden rounded-md border border-black/[0.08] dark:border-white/[0.08]">
        <div className="flex h-11 items-center justify-between border-b border-black/[0.07] px-4 dark:border-white/[0.07]">
          <h2 className="text-[13px] font-semibold text-primary">
            Intro & referrals
          </h2>
          <span className="text-[11px] tabular-nums text-primary/40">
            {data.introOffers.length +
              data.referrals.made.length +
              data.referrals.received.length}
          </span>
        </div>
        <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-black/[0.07] dark:lg:divide-white/[0.07]">
          <OverviewList
            title="Intro offers"
            emptyLabel="No intro offers redeemed."
            items={data.introOffers.map((redemption) => ({
              id: redemption.id,
              title: redemption.offer.name,
              detail: `${redemption.classesUsed} classes used · expires ${format(new Date(redemption.expiresAt), "d MMM yyyy")}`,
              status: redemption.status,
            }))}
          />
          <OverviewList
            title="Referrals"
            emptyLabel="No referral activity yet."
            items={[
              ...data.referrals.made.map((referral) => ({
                id: referral.id,
                title: `Referral code ${referral.code}`,
                detail: referral.refereeEmail ?? "No referee email",
                status: referral.status,
              })),
              ...data.referrals.received.map((referral) => ({
                id: referral.id,
                title: `Referred by ${referral.referrerClient?.name ?? "another client"}`,
                detail: `Code ${referral.code}`,
                status: referral.status,
              })),
            ]}
          />
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="group flex min-h-24 min-w-0 flex-col rounded-md border border-black/[0.07] bg-background p-4 transition-colors hover:border-black/15 dark:border-white/[0.07] dark:hover:border-white/15">
      <p className="truncate text-[10px] font-medium text-primary/45">{label}</p>
      <p className="mt-auto truncate pt-2 text-xl font-bold tabular-nums text-primary/85">
        {value}
      </p>
      <p className="truncate text-[10px] text-primary/45 group-hover:text-primary/60">
        {detail}
      </p>
    </div>
  );
}

type OverviewItem = {
  id: string;
  title: string;
  detail: string;
  status: string;
};

function OverviewList({
  emptyLabel,
  items,
  title,
}: {
  emptyLabel: string;
  items: OverviewItem[];
  title: string;
}) {
  return (
    <div className="min-w-0 border-b border-black/[0.07] last:border-b-0 lg:border-b-0 dark:border-white/[0.07]">
      <div className="border-b border-black/[0.06] px-4 py-2.5 text-[11px] font-medium text-primary/55 dark:border-white/[0.06]">
        {title}
      </div>
      {items.length ? (
        <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
          {items.map((item) => (
            <div key={item.id} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-primary">{item.title}</p>
                <p className="mt-0.5 truncate text-[10px] text-primary/45">{item.detail}</p>
              </div>
              <MemberStatusBadge status={item.status} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-28 items-center justify-center px-5 text-xs text-primary/40">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}
