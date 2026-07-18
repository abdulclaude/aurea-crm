"use client";

import { format, formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Share2,
} from "lucide-react";
import type { LifecycleSummary } from "./member-lifecycle-types";
import { labelize } from "./member-lifecycle-types";
import { EmptyLine, Metric, Row, Section } from "./member-lifecycle-shared";

export { PaymentsView } from "./member-lifecycle-payments-view";

export function WaiversView({ data }: { data: LifecycleSummary }) {
  return (
    <div className="space-y-5 py-5">
      <div className="grid gap-2 md:grid-cols-2 px-6">
        <Metric
          label="Waiver status"
          value={labelize(data.summary.waiverStatus)}
        />
        <Metric label="Missing required" value={`${data.waivers.missing.length}`} />
      </div>
      <Section title="Required waivers" icon={FileCheck2}>
        {data.waivers.required.map((template) => {
          const missing = data.waivers.missing.some(
            (item) => item.id === template.id,
          );
          return (
            <Row
              key={template.id}
              title={template.name}
              meta={`Version ${template.version}`}
              status={missing ? "Missing" : "Signed"}
              tone={missing ? "danger" : "success"}
            />
          );
        })}
        {data.waivers.required.length === 0 ? (
          <EmptyLine label="No required waiver templates configured." />
        ) : null}
      </Section>
      <Section title="Signature history" icon={CheckCircle2}>
        {data.waivers.signatures.map((signature) => (
          <Row
            key={signature.id}
            title={signature.template.name}
            meta={`Signed ${format(new Date(signature.signedAt), "d MMM yyyy")}`}
            status={
              signature.expiresAt
                ? `Expires ${format(new Date(signature.expiresAt), "d MMM")}`
                : "Current"
            }
          />
        ))}
        {data.waivers.signatures.length === 0 ? (
          <EmptyLine label="No signatures collected for this member." />
        ) : null}
      </Section>
    </div>
  );
}

export function ActivityView({ data }: { data: LifecycleSummary }) {
  return (
    <div className="space-y-5 py-5">
      <Section title="Recent visits" icon={Activity} hideSeparator>
        {data.checkIns.map((checkIn) => (
          <Row
            key={checkIn.id}
            title={checkIn.studioClass.name}
            meta={format(new Date(checkIn.checkedInAt), "EEE d MMM, HH:mm")}
            status={checkIn.isLateArrival ? "Late" : "Checked in"}
          />
        ))}
        {data.checkIns.length === 0 ? (
          <EmptyLine label="No check-ins yet." />
        ) : null}
      </Section>
      <Section title="Workflow touches" icon={Share2}>
        {data.automationEvents.map((event) => (
          <Row
            key={event.id}
            title={event.name}
            meta={`${event.workflow?.name ?? "Workflow"} · ${formatDistanceToNow(
              new Date(event.occurredAt),
              { addSuffix: true },
            )}`}
            status={labelize(event.type)}
          />
        ))}
        {data.automationEvents.length === 0 ? (
          <EmptyLine label="No automation events yet." />
        ) : null}
      </Section>
      {data.summary.churnRisk ? (
        <Section title="Churn risk" icon={AlertTriangle}>
          <Row
            title={`${data.summary.churnRisk.score}/100`}
            meta={`Calculated ${formatDistanceToNow(
              new Date(data.summary.churnRisk.calculatedAt),
              { addSuffix: true },
            )}`}
            status={data.summary.churnRisk.riskLevel}
            tone={
              data.summary.churnRisk.riskLevel === "LOW"
                ? "success"
                : "danger"
            }
          />
        </Section>
      ) : null}
    </div>
  );
}
