"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BadgeCheck,
  ChartNoAxesColumn,
  Repeat2,
  Trophy,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTRPC } from "@/trpc/client";
import { AutomationEventsTable } from "./automation-events-table";

const formatter = new Intl.NumberFormat("en-GB", {
  maximumFractionDigits: 0,
});

export function AutomationInsights() {
  const trpc = useTRPC();
  const insights = useQuery(
    trpc.executions.getAutomationInsights.queryOptions({ days: 30 }),
  );

  if (insights.isLoading) {
    return (
      <div className="p-6 text-xs text-primary/60">
        Loading automation insights...
      </div>
    );
  }

  if (!insights.data) {
    return (
      <div className="p-6 text-xs text-primary/60">
        No automation insight data yet.
      </div>
    );
  }

  const { recentEvents, summary, workflows } = insights.data;

  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          title="Membership signups"
          value={summary.membershipSignupAutomations}
          helper="Signup-triggered automations"
          icon={Users}
        />
        <MetricCard
          title="Intro offer signals"
          value={summary.introOfferAutomations}
          helper="Intro offer automation runs"
          icon={BadgeCheck}
        />
        <MetricCard
          title="Class milestones"
          value={summary.classMilestoneAutomations}
          helper="Milestone-triggered runs"
          icon={Trophy}
        />
        <MetricCard
          title="Lead conversions"
          value={summary.leadToMemberConversions}
          helper="Active-stage conversion signals"
          icon={ChartNoAxesColumn}
        />
        <MetricCard
          title="Conversion rate"
          value={`${summary.conversionRate.toFixed(1)}%`}
          helper={`${formatter.format(summary.conversionSignals)} conversion signals`}
          icon={Repeat2}
        />
        <MetricCard
          title="Automation success"
          value={`${summary.successRate.toFixed(1)}%`}
          helper={`${formatter.format(summary.successfulExecutions)} successful runs`}
          icon={Activity}
        />
      </div>

      <Card className="rounded-sm border-black/10 bg-background">
        <CardHeader>
          <CardTitle className="text-sm">Workflow conversion signals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Runs</TableHead>
                <TableHead>Success</TableHead>
                <TableHead>Failures</TableHead>
                <TableHead>Signals</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.length > 0 ? (
                workflows.map((workflow) => (
                  <TableRow key={workflow.workflowId}>
                    <TableCell className="font-medium">
                      {workflow.workflowName}
                    </TableCell>
                    <TableCell>{workflow.executions}</TableCell>
                    <TableCell>{workflow.successes}</TableCell>
                    <TableCell>{workflow.failures}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {workflow.conversions}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-xs text-primary/60"
                  >
                    No workflow conversion signals in the last 30 days.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AutomationEventsTable events={recentEvents} />
    </div>
  );
}

function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
}: {
  title: string;
  value: number | string;
  helper: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-sm border-black/10 bg-background">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-primary/70">
          {title}
        </CardTitle>
        <Icon className="size-4 text-primary/50" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        <p className="mt-1 text-xs text-primary/50">{helper}</p>
      </CardContent>
    </Card>
  );
}
