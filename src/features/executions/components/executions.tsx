"use client";

import {
  CheckCircle2Icon,
  CircleDotDashedIcon,
  Loader2Icon,
  XCircleIcon,
} from "lucide-react";
import { useQueryState } from "nuqs";

import {
  EmptyView,
  EntityHeader,
  EntityPagination,
  EntitySearch,
  ErrorView,
  LoadingView,
} from "@/components/react-flow/entity-components";
import { PageTabs } from "@/components/ui/page-tabs";
import { Separator } from "@/components/ui/separator";
import { ExecutionStatus } from "@/db/enums";
import { AutomationInsights } from "./automation-insights";
import { ExecutionMetric } from "./execution-metric";
import { ExecutionRunRow } from "./execution-run-row";
import { useSuspenseExecutions } from "../hooks/use-executions";
import { useExecutionsParams } from "../hooks/use-executions-params";

const STATUS_FILTERS = ["ALL", "RUNNING", "SUCCESS", "FAILED"] as const;

function resolveStatusFilter(value: string) {
  return STATUS_FILTERS.find((status) => status === value) ?? "ALL";
}

const ExecutionsList = () => {
  const executions = useSuspenseExecutions();
  const [params, setParams] = useExecutionsParams();
  const data = executions.data;
  const activeStatus = params.status;
  const statusTabs = [
    { id: "ALL", label: "All runs", badge: data.summary.all },
    {
      id: ExecutionStatus.RUNNING,
      label: "Running",
      badge: data.summary.running,
    },
    {
      id: ExecutionStatus.SUCCESS,
      label: "Succeeded",
      badge: data.summary.success,
    },
    {
      id: ExecutionStatus.FAILED,
      label: "Failed",
      badge: data.summary.failed,
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 border-b border-black/5 dark:border-white/5 md:grid-cols-4">
        <ExecutionMetric
          icon={CircleDotDashedIcon}
          label="Total runs"
          value={data.summary.all}
        />
        <ExecutionMetric
          icon={Loader2Icon}
          label="Running"
          value={data.summary.running}
          tone="sky"
        />
        <ExecutionMetric
          icon={CheckCircle2Icon}
          label="Succeeded"
          value={data.summary.success}
          tone="emerald"
        />
        <ExecutionMetric
          icon={XCircleIcon}
          label="Needs attention"
          value={data.summary.failed}
          tone="rose"
        />
      </div>

      <PageTabs
        tabs={statusTabs}
        activeTab={activeStatus}
        onTabChange={(status) =>
          setParams({ status: resolveStatusFilter(status), page: 1 })
        }
        className="px-4 md:px-6"
      />

      <div className="p-4 md:p-6">
        {data.items.length === 0 ? (
          <ExecutionsEmpty
            filtered={activeStatus !== "ALL" || Boolean(params.search)}
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-black/10 bg-background dark:border-white/10">
            <div className="hidden grid-cols-[minmax(220px,1.5fr)_140px_150px_110px_28px] gap-4 border-b border-black/5 bg-primary-foreground/15 px-5 py-2.5 text-[10px] font-medium uppercase text-primary/45 dark:border-white/5 md:grid">
              <span>Workflow</span>
              <span>Status</span>
              <span>Started</span>
              <span>Duration</span>
              <span className="sr-only">Open</span>
            </div>
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {data.items.map((item) => (
                <ExecutionRunRow key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
        <div className="mt-3">
          <EntityPagination
            page={data.page}
            totalPages={data.totalPages}
            disabled={executions.isFetching}
            onPageChange={(page) => setParams({ page })}
          />
        </div>
      </div>
    </>
  );
};

export default ExecutionsList;

export const ExecutionsContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [view, setView] = useQueryState("view", {
    defaultValue: "timeline",
    clearOnDefault: true,
  });
  const [params, setParams] = useExecutionsParams();

  return (
    <div className="min-h-full bg-background">
      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-end md:justify-between md:p-6">
        <EntityHeader
          title="Executions"
          description="Monitor every workflow run and investigate failures"
        />
        {view === "timeline" ? (
          <EntitySearch
            className="w-full md:w-80"
            value={params.search}
            onChange={(search) =>
              setParams({ search, workflowId: "", page: 1 })
            }
            placeholder="Search by workflow name"
          />
        ) : null}
      </div>
      <Separator className="bg-black/5 dark:bg-white/5" />
      <PageTabs
        tabs={[
          { id: "timeline", label: "Runs" },
          { id: "automation-insights", label: "Automation insights" },
        ]}
        activeTab={view}
        onTabChange={setView}
        className="px-4 md:px-6"
      />
      {view === "automation-insights" ? <AutomationInsights /> : children}
    </div>
  );
};

export const ExecutionsLoading = () => (
  <LoadingView message="Loading executions..." />
);

export const ExecutionsError = () => (
  <ErrorView message="Could not load executions." />
);

export const ExecutionsEmpty = ({ filtered = false }: { filtered?: boolean }) => (
  <EmptyView
    title={filtered ? "No matching executions" : "No executions yet"}
    label="execution"
    message={
      filtered
        ? "Try another workflow name or status."
        : "Run a workflow to see its status, duration, output, and errors here."
    }
  />
);
