"use client";

import { AlertTriangle, CircleCheck, Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function FreshnessBadge({ state }: { state?: string }) {
  const current = state === "CURRENT";
  return (
    <Badge
      variant="outline"
      className={current ? "text-teal-700" : "text-amber-700"}
    >
      {current ? <CircleCheck /> : <Clock3 />}
      {(state ?? "LOADING").replaceAll("_", " ").toLowerCase()}
    </Badge>
  );
}

export function ReportDataGapRow(props: {
  label: string;
  detail: string;
  severity: string;
  count?: number | null;
}) {
  return (
    <div className="flex gap-3 py-4 text-xs">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <div>
        <p className="font-medium">
          {props.label}
          {props.count ? ` (${props.count})` : ""}
        </p>
        <p className="mt-1 text-primary/60">{props.detail}</p>
      </div>
      <Badge variant="outline" className="ml-auto self-start">
        {props.severity.toLowerCase()}
      </Badge>
    </div>
  );
}

export function MetricDefinition({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <p>
      <span className="font-medium">{label}:</span>{" "}
      <span className="text-primary/65">{value}</span>
    </p>
  );
}
