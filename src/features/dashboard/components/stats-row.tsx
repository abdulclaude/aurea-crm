"use client";

import { useMemo } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MAX_SPARK_POINTS = 14;

function smoothSparkline(raw: { v: number }[]): { v: number }[] {
  if (raw.length <= MAX_SPARK_POINTS) return raw;
  const bucketSize = raw.length / MAX_SPARK_POINTS;
  const result: { v: number }[] = [];
  for (let i = 0; i < MAX_SPARK_POINTS; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.floor((i + 1) * bucketSize);
    let sum = 0;
    for (let j = start; j < end; j++) sum += raw[j].v;
    result.push({ v: sum / (end - start) });
  }
  return result;
}

type StatItem = {
  label: string;
  value: string | number;
  change?: number;
  spark?: { v: number }[];
  color: string;
};

export function StatCard({
  stat,
  isEditing,
  isLoading,
  comparisonLabel,
}: {
  stat: StatItem;
  isEditing?: boolean;
  isLoading?: boolean;
  comparisonLabel?: string;
}) {
  const sparkData = useMemo(
    () => (stat.spark ? smoothSparkline(stat.spark) : undefined),
    [stat.spark],
  );

  return (
    <div
      className={cn(
        "block h-full rounded-xl border border-black/[0.07] bg-white p-1 shadow-xs",
        isEditing && "ring ring-indigo-500/50",
      )}
    >
      <div className="flex h-full flex-col rounded-[calc(theme(borderRadius.xl)-4px)] border border-black/[0.04] p-3">
        {isLoading ? (
          <Skeleton className="h-3 w-24 bg-black/[0.07]" />
        ) : (
          <p className="text-[10px] font-medium text-black/45">{stat.label}</p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          {isLoading ? (
            <Skeleton className="h-8 w-20 bg-black/[0.08]" />
          ) : (
            <p className="text-2xl font-bold tracking-tight text-black/80">
              {stat.value}
            </p>
          )}
          {isLoading ? (
            <div className="flex shrink-0 flex-col items-center gap-2">
              <Skeleton className="h-3 w-8 bg-black/[0.07]" />
              <Skeleton className="h-8 w-16 bg-black/[0.07]" />
            </div>
          ) : sparkData && sparkData.length > 0 ? (
            <div className="flex shrink-0 flex-col items-center gap-2">
              {stat.change !== undefined && (
                <StatChangeText
                  change={stat.change}
                  comparisonLabel={comparisonLabel}
                />
              )}
              <div className="h-8 w-16">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <LineChart
                    data={sparkData}
                    margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
                  >
                    <Line
                      type="natural"
                      dataKey="v"
                      stroke={
                        stat.change !== undefined
                          ? stat.change > 0
                            ? "#10b981"
                            : stat.change < 0
                              ? "#ef4444"
                              : "#9ca3af"
                          : stat.color
                      }
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatChangeText({
  change,
  comparisonLabel,
}: {
  change: number;
  comparisonLabel?: string;
}) {
  const changeClassName = cn(
    "text-[10px] font-medium",
    change > 0
      ? "text-emerald-600"
      : change < 0
        ? "text-red-500"
        : "text-black/40",
  );
  const text = `${change > 0 ? "+" : ""}${change}%`;

  if (!comparisonLabel) {
    return <p className={changeClassName}>{text}</p>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <p className={cn(changeClassName, "cursor-help")}>{text}</p>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="w-max max-w-none whitespace-nowrap text-[11px]"
      >
        {comparisonLabel}
      </TooltipContent>
    </Tooltip>
  );
}

export function StatsRow({ stats }: { stats: StatItem[] }) {
  return (
    <>
      {stats.map((stat) => (
        <StatCard key={stat.label} stat={stat} />
      ))}
    </>
  );
}
