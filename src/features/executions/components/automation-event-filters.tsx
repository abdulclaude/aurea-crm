"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatAutomationLabel } from "@/features/executions/components/automation-event-labels";
import type { AutomationEventExplorerInput } from "@/features/executions/server/automation-event-contracts";
import type { AppRouter } from "@/trpc/routers/_app";

const ALL = "__all__";

export type AutomationExplorerFilters = AutomationEventExplorerInput;

type FilterOptions = inferRouterOutputs<AppRouter>["executions"]["getAutomationEvents"]["options"];

export const DEFAULT_AUTOMATION_FILTERS: AutomationExplorerFilters = {
  days: 30,
  eventType: null,
  workflowId: null,
  clientId: null,
  clientSearch: "",
  sourceNodeType: null,
  page: 1,
  pageSize: 25,
};

export function AutomationEventFilters({
  filters,
  options,
  onChange,
}: {
  filters: AutomationExplorerFilters;
  options: FilterOptions;
  onChange: (filters: AutomationExplorerFilters) => void;
}) {
  const update = (patch: Partial<AutomationExplorerFilters>) =>
    onChange({ ...filters, ...patch, page: 1 });

  return (
    <div className="grid gap-2 border-y border-black/10 py-3 sm:grid-cols-2 xl:grid-cols-[140px_repeat(4,minmax(150px,1fr))_36px]">
      <FilterSelect
        label="Date range"
        value={String(filters.days)}
        onValueChange={(value) => update({ days: Number(value) })}
        items={[
          { value: "7", label: "Last 7 days" },
          { value: "30", label: "Last 30 days" },
          { value: "90", label: "Last 90 days" },
          { value: "365", label: "Last 365 days" },
        ]}
      />
      <FilterSelect
        label="Event type"
        value={filters.eventType ?? ALL}
        onValueChange={(value) =>
          update({
            eventType:
              options.eventTypes.find((option) => option === value) ?? null,
          })
        }
        items={[
          { value: ALL, label: "All event types" },
          ...options.eventTypes.map((value) => ({
            value,
            label: formatAutomationLabel(value),
          })),
        ]}
      />
      <FilterSelect
        label="Workflow"
        value={filters.workflowId ?? ALL}
        onValueChange={(value) =>
          update({ workflowId: value === ALL ? null : value })
        }
        items={[
          { value: ALL, label: "All workflows" },
          ...options.workflows.map(({ id, name }) => ({ value: id, label: name })),
        ]}
      />
      <Input
        type="search"
        value={filters.clientSearch}
        className="w-full shadow-none"
        aria-label="Customer name or email"
        placeholder="Customer name or email"
        onChange={(event) => update({
          clientId: null,
          clientSearch: event.target.value,
        })}
      />
      <FilterSelect
        label="Source trigger"
        value={filters.sourceNodeType ?? ALL}
        onValueChange={(value) =>
          update({
            sourceNodeType:
              options.sourceNodeTypes.find((option) => option === value) ??
              null,
          })
        }
        items={[
          { value: ALL, label: "All source triggers" },
          ...options.sourceNodeTypes.map((value) => ({
            value,
            label: formatAutomationLabel(value),
          })),
        ]}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9"
        title="Reset filters"
        aria-label="Reset automation event filters"
        onClick={() => onChange(DEFAULT_AUTOMATION_FILTERS)}
      >
        <RotateCcw className="size-4" />
      </Button>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onValueChange,
  items,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  items: Array<{ value: string; label: string }>;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full shadow-none" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
