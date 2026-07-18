import { Clock3, Gift, UserPlus } from "lucide-react";
import type { JSX, ReactNode } from "react";

import { formatDecimalMoney } from "@/features/commerce/lib/money";
import type { PublishedReferralWidgetSource } from "@/features/publications/public/contracts";
import { buildPublicationThemeCss } from "@/features/publications/public/theme";

type RewardType = PublishedReferralWidgetSource["program"]["referrerRewardType"];

export function PublishedReferralWidget({
  source,
  themeSnapshot,
  transparentBackground,
}: {
  source: PublishedReferralWidgetSource;
  themeSnapshot: unknown;
  transparentBackground: boolean;
}): JSX.Element {
  const { config } = source.widget;
  const { program } = source;
  const themeCss = buildPublicationThemeCss(themeSnapshot);
  const brandName = source.brand.companyName ?? source.brand.name ?? "Referral program";
  return (
    <main
      className="aurea-publication-root min-h-screen px-4 py-5"
      style={{ background: transparentBackground ? "transparent" : undefined }}
    >
      {themeCss ? <style dangerouslySetInnerHTML={{ __html: themeCss }} /> : null}
      <div className="mx-auto max-w-4xl">
        <header className="mb-5 flex items-center gap-3 border-b border-[var(--publication-border,#e5e7eb)] pb-4">
          {source.brand.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="size-9 object-contain" src={source.brand.logo} alt="" />
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{brandName}</h1>
            <p className="text-xs opacity-65">Referral program</p>
          </div>
        </header>
        <section aria-labelledby="referral-program-name">
          <h2 id="referral-program-name" className="text-lg font-semibold">
            {program.name}
          </h2>
          <div
            className={
              config.layout === "INLINE"
                ? "mt-4 grid gap-px overflow-hidden border border-[var(--publication-border,#e5e7eb)] bg-[var(--publication-border,#e5e7eb)] sm:grid-cols-2"
                : "mt-4 divide-y divide-[var(--publication-border,#e5e7eb)] border-y border-[var(--publication-border,#e5e7eb)]"
            }
          >
            {config.showReferrerReward ? (
              <Reward
                icon={<Gift className="size-4" />}
                label="Member reward"
                value={formatReward(
                  program.referrerRewardType,
                  program.referrerRewardValue,
                  program.currency,
                )}
                inline={config.layout === "INLINE"}
              />
            ) : null}
            {config.showRefereeReward ? (
              <Reward
                icon={<UserPlus className="size-4" />}
                label="New client reward"
                value={formatReward(
                  program.refereeRewardType,
                  program.refereeRewardValue,
                  program.currency,
                )}
                inline={config.layout === "INLINE"}
              />
            ) : null}
          </div>
          {config.showOfferWindow ? (
            <p className="mt-4 flex items-center gap-2 text-xs opacity-65">
              <Clock3 className="size-3.5" />
              New client offer valid for {program.refereeOfferDays} days
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function Reward({
  icon,
  label,
  value,
  inline,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  inline: boolean;
}): JSX.Element {
  return (
    <div className={inline ? "bg-[var(--publication-background,#fff)] p-4" : "py-4"}>
      <p className="flex items-center gap-2 text-xs opacity-65">
        <span className="text-[var(--publication-primary,#2563eb)]">{icon}</span>
        {label}
      </p>
      <p className="mt-2 text-base font-semibold">{value}</p>
    </div>
  );
}

function formatReward(type: RewardType, value: string, currency: string): string {
  if (type === "CREDIT") {
    return `${formatDecimalMoney(value, currency)} account credit`;
  }
  if (type === "CASH") return `${formatDecimalMoney(value, currency)} cash`;
  if (type === "DISCOUNT") return `${formatDecimal(value)}% discount`;
  return `${formatDecimal(value)} free ${Number(value) === 1 ? "class" : "classes"}`;
}

function formatDecimal(value: string): string {
  return value.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}
