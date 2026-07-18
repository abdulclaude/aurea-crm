"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity,
  BadgeCheck,
  ChartNoAxesColumn,
  HeartPulse,
  Repeat2,
  Share2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutomationEventExplorer } from "./automation-event-explorer";

const formatter = new Intl.NumberFormat("en-GB", {
  maximumFractionDigits: 0,
});

export function AutomationInsights() {
  const trpc = useTRPC();
  const [days, setDays] = useState(30);
  const insights = useQuery(
    trpc.executions.getAutomationInsights.queryOptions({ days }),
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

  const { summary, workflows } = insights.data;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Automation performance</h2>
          <p className="text-xs text-primary/50">Conversion and recovery signals</p>
        </div>
        <Select
          value={String(days)}
          onValueChange={(value) => setDays(Number(value))}
        >
          <SelectTrigger className="h-8 w-32 text-xs shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          title="Referral conversions"
          value={summary.referralConversions}
          helper="Converted referral signals"
          icon={Share2}
        />
        <MetricCard
          title="Recovery signals"
          value={summary.recoverySignals}
          helper="Failed payment, no-show, and cancellation signals"
          icon={HeartPulse}
        />
        <MetricCard
          title="Runs with conversion"
          value={`${summary.conversionRate.toFixed(1)}%`}
          helper={`${formatter.format(summary.convertedExecutions)} of ${formatter.format(summary.successfulExecutions)} successful runs`}
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

      <AutomationEventExplorer />
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
