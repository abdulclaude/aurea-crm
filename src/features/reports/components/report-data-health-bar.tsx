"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, BookOpenText, CircleCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { ReportGroupId } from "@/features/reports/types";
import { useTRPC } from "@/trpc/client";

import {
  FreshnessBadge,
  MetricDefinition,
  ReportDataGapRow,
} from "./report-data-health-parts";

type ReportDataHealthBarProps = {
  groupId: ReportGroupId;
  reportId: string;
  sourceLimitReached: boolean;
};

export function ReportDataHealthBar({
  groupId,
  reportId,
  sourceLimitReached,
}: ReportDataHealthBarProps) {
  const trpc = useTRPC();
  const health = useQuery(
    trpc.reportFoundation.dataHealth.queryOptions({ groupId, reportId }),
  );
  const contracts = useQuery(
    trpc.reportFoundation.metricContracts.queryOptions({ groupId, reportId }),
  );
  const data = health.data;
  const rowLimitReached = sourceLimitReached;
  const gapCount =
    (data?.gaps.length ?? 0) +
    (rowLimitReached ? 1 : 0) +
    (health.isError ? 1 : 0);

  return (
    <div className="border-b border-black/5 px-6 py-3 dark:border-white/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] text-primary/60">
          <FreshnessBadge state={health.isError ? "ERROR" : data?.freshness} />
          <span>
            {health.isError
              ? "Health unavailable"
              : (data?.timezone ?? "Loading timezone")}
          </span>
          <span aria-hidden="true">/</span>
          <span>{data?.currencies.join(", ") ?? "Loading currency"}</span>
          {data?.dataAsOf ? (
            <span>
              Updated {formatDistanceToNow(data.dataAsOf, { addSuffix: true })}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-[11px]">
                <AlertTriangle className="size-3.5" />
                {gapCount === 0
                  ? "No known gaps"
                  : `${gapCount} data gap${gapCount === 1 ? "" : "s"}`}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl rounded-lg">
              <DialogHeader>
                <DialogTitle className="text-sm">Data quality</DialogTitle>
                <DialogDescription>
                  Freshness, reconciliation, currency, and bounded-result checks
                  for this location.
                </DialogDescription>
              </DialogHeader>
              <div className="divide-y divide-black/5 dark:divide-white/5">
                {health.isError ? (
                  <ReportDataGapRow
                    label="Health check failed"
                    detail={health.error.message}
                    severity="WARNING"
                  />
                ) : null}
                {rowLimitReached ? (
                  <ReportDataGapRow
                    label="Bounded source preview"
                    detail="The table loaded the newest 500 source rows. Filters, totals, and exports apply only to those loaded rows and may be incomplete."
                    severity="WARNING"
                  />
                ) : null}
                {data?.gaps.map((gap) => (
                  <ReportDataGapRow key={gap.id} {...gap} />
                ))}
                {!rowLimitReached && data?.gaps.length === 0 ? (
                  <div className="flex items-center gap-2 py-5 text-xs text-primary/65">
                    <CircleCheck className="size-4 text-teal-600" />
                    No known data quality gaps in the current scope.
                  </div>
                ) : null}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-[11px]">
                <BookOpenText className="size-3.5" />
                Definitions
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto rounded-lg">
              <DialogHeader>
                <DialogTitle className="text-sm">Metric contracts</DialogTitle>
                <DialogDescription>
                  The source, grain, inclusion, time, currency, refund, and
                  late-data rules used by this report.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-0">
                {contracts.data?.map((contract, index) => (
                  <div key={contract.id}>
                    {index > 0 ? <Separator /> : null}
                    <div className="space-y-2 py-4 text-xs">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{contract.name}</p>
                        <Badge variant="outline">
                          {contract.unit.toLowerCase()}
                        </Badge>
                      </div>
                      <p className="text-primary/65">{contract.description}</p>
                      <MetricDefinition
                        label="Source and grain"
                        value={`${contract.sourceOfTruth}. ${contract.grain}`}
                      />
                      <MetricDefinition
                        label="Eligibility"
                        value={contract.eligibility}
                      />
                      <MetricDefinition
                        label="Time"
                        value={`${contract.timestampField}. ${contract.timezonePolicy}`}
                      />
                      <MetricDefinition
                        label="Money and refunds"
                        value={`${contract.currencyPolicy} ${contract.refundPolicy}`}
                      />
                      <MetricDefinition
                        label="Late data"
                        value={contract.lateDataPolicy}
                      />
                    </div>
                  </div>
                ))}
                {contracts.data?.length === 0 ? (
                  <p className="py-5 text-xs text-primary/60">
                    This operational table has fields but no promoted KPI
                    contract yet.
                  </p>
                ) : null}
                {contracts.isError ? (
                  <div className="py-5 text-xs text-destructive">
                    Metric definitions could not be loaded:{" "}
                    {contracts.error.message}
                  </div>
                ) : null}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
