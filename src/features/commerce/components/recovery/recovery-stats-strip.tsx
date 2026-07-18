import type { RecoveryStats } from "./recovery-ui-types";
import { formatRecoveryMoney } from "./recovery-formatters";

export function RecoveryStatsStrip({
  stats,
}: {
  stats: RecoveryStats | undefined;
}) {
  const count = (status: RecoveryStats["statuses"][number]["status"]) =>
    stats?.statuses.find((item) => item.status === status)?.count ?? 0;
  return (
    <div className="grid divide-y border-b sm:grid-cols-4 sm:divide-x sm:divide-y-0">
      <Metric label="Open" value={count("OPEN")} />
      <Metric label="In progress" value={count("IN_PROGRESS")} />
      <Metric label="Exhausted" value={count("EXHAUSTED")} />
      <Metric
        label="Amount at risk"
        value={
          stats?.activeAmounts.length
            ? stats.activeAmounts
                .map((item) =>
                  formatRecoveryMoney(
                    item.amountMinor,
                    item.currency,
                    item.currencyExponent,
                  ),
                )
                .join(" + ")
            : "-"
        }
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 px-6 py-4 sm:px-8">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold">{value}</p>
    </div>
  );
}
