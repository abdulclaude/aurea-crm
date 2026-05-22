"use client";

import Link from "next/link";
import type { SankeyData } from "recharts";
import {
  EvilSankeyChart,
  Link as SankeyLink,
  Node,
  NodeLabel,
  Tooltip,
} from "@/components/evilcharts/charts/sankey-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartShell } from "./chart-shell";
import { CompareSwitch } from "./compare-switch";

const chartConfig = {
  Inquiries: {
    label: "Inquiries",
    colors: { light: ["#3b82f6"], dark: ["#60a5fa"] },
  },
  "Trials & intros": {
    label: "Trials & intros",
    colors: { light: ["#f59e0b"], dark: ["#fbbf24"] },
  },
  "First bookings": {
    label: "First bookings",
    colors: { light: ["#8b5cf6"], dark: ["#a78bfa"] },
  },
  "First visits": {
    label: "First visits",
    colors: { light: ["#10b981"], dark: ["#34d399"] },
  },
  Memberships: {
    label: "Memberships",
    colors: { light: ["#06b6d4"], dark: ["#22d3ee"] },
  },
  "Not converted": {
    label: "Not converted",
    colors: { light: ["#94a3b8"], dark: ["#cbd5e1"] },
  },
} satisfies ChartConfig;

const emptySankeyData = {
  nodes: [],
  links: [],
} satisfies SankeyData;

type ConversionMetrics = {
  inquiryToMembershipRate: number;
  firstVisitRate: number;
  introToMembershipRate: number;
};

type ConversionSankeyProps = {
  data:
    | {
        sankey: SankeyData;
        metrics: ConversionMetrics;
      }
    | undefined;
  comparisonData?:
    | {
        metrics: ConversionMetrics;
      }
    | null;
  range: { start: Date; end: Date };
  isEditing?: boolean;
  isLoading?: boolean;
};

export function ConversionSankey({
  data,
  comparisonData,
  range,
  isEditing,
  isLoading,
}: ConversionSankeyProps) {
  const hasLinks =
    data?.sankey.links.some(
      (link) => Number.isFinite(link.value) && link.value > 0,
    ) ?? false;

  const prev = comparisonData?.metrics;

  return (
    <ChartShell
      title="Member conversion flow"
      isEditing={isEditing}
      right={
        <div className="flex items-center gap-2">
          <CompareSwitch ownerId="chart-conversion-sankey" range={range} />
          <Link
            href="/acquisition"
            className="text-[11px] font-medium text-black/40 hover:text-black/70"
          >
            Acquisition →
          </Link>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex h-full flex-col px-3 pb-3">
          <div className="min-h-0 flex-1">
            <EvilSankeyChart
              data={data?.sankey ?? emptySankeyData}
              config={chartConfig}
              nodeWidth={72}
              nodePadding={18}
              linkCurvature={0.45}
              className="h-full text-black!"
              isLoading
            >
              <Node radius={7} isClickable>
                <NodeLabel
                  position="inside"
                  showValues
                  valueFormatter={(value) => value.toLocaleString()}
                />
              </Node>
              <SankeyLink variant="gradient" verticalPadding={2} />
              <Tooltip variant="frosted-glass" roundness="lg" />
            </EvilSankeyChart>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2">
            <MiniMetricSkeleton />
            <MiniMetricSkeleton />
            <MiniMetricSkeleton />
          </div>
        </div>
      ) : data && hasLinks ? (
        <div className="flex h-full flex-col px-3 pb-3">
          <div className="min-h-0 flex-1">
            <EvilSankeyChart
              data={data.sankey}
              config={chartConfig}
              nodeWidth={72}
              nodePadding={18}
              linkCurvature={0.45}
              className="h-full text-black!"
            >
              <Node radius={7} isClickable>
                <NodeLabel
                  position="inside"
                  showValues
                  valueFormatter={(value) => value.toLocaleString()}
                />
              </Node>

              <SankeyLink variant="gradient" verticalPadding={2} />
              <Tooltip variant="frosted-glass" roundness="lg" />
            </EvilSankeyChart>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2">
            <MiniMetric
              label="Inquiry → member"
              value={`${data.metrics.inquiryToMembershipRate}%`}
              previous={prev ? `${prev.inquiryToMembershipRate}%` : undefined}
            />
            <MiniMetric
              label="Booked → visit"
              value={`${data.metrics.firstVisitRate}%`}
              previous={prev ? `${prev.firstVisitRate}%` : undefined}
            />
            <MiniMetric
              label="Intro → member"
              value={`${data.metrics.introToMembershipRate}%`}
              previous={prev ? `${prev.introToMembershipRate}%` : undefined}
            />
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <p className="text-[12px] text-black/40">No conversion flow yet</p>
          <Link
            href="/clients/new"
            className="text-[11px] font-medium text-black/50 underline underline-offset-4 hover:text-black/70"
          >
            Add your first lead
          </Link>
        </div>
      )}
    </ChartShell>
  );
}

function MiniMetricSkeleton() {
  return (
    <div className="rounded-md border border-black/[0.06] bg-black/[0.015] px-2 py-1.5">
      <Skeleton className="h-2.5 w-20 bg-black/[0.06]" />
      <Skeleton className="mt-2 h-3.5 w-12 bg-black/[0.08]" />
    </div>
  );
}

function MiniMetric({
  label,
  value,
  previous,
}: {
  label: string;
  value: string;
  previous?: string;
}) {
  return (
    <div className="rounded-md border border-black/[0.06] bg-black/[0.015] px-2 py-1.5">
      <p className="truncate text-[10px] text-black/35">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <p className="text-[13px] font-semibold text-black/70">{value}</p>
        {previous && (
          <p className="text-[10px] font-medium text-orange-500/70">
            vs {previous}
          </p>
        )}
      </div>
    </div>
  );
}
