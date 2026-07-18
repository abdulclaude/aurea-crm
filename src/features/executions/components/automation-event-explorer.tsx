"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useDebounce } from "use-debounce";

import { Button } from "@/components/ui/button";
import {
  AutomationEventFilters,
  DEFAULT_AUTOMATION_FILTERS,
  type AutomationExplorerFilters,
} from "@/features/executions/components/automation-event-filters";
import { AutomationEventExplorerTable } from "@/features/executions/components/automation-event-explorer-table";
import { useTRPC } from "@/trpc/client";

export function AutomationEventExplorer() {
  const trpc = useTRPC();
  const [filters, setFilters] = useState<AutomationExplorerFilters>(
    DEFAULT_AUTOMATION_FILTERS,
  );
  const [debouncedClientSearch] = useDebounce(filters.clientSearch, 350);
  const events = useQuery(
    trpc.executions.getAutomationEvents.queryOptions({
      ...filters,
      clientSearch: debouncedClientSearch,
    }),
  );
  const data = events.data;

  return (
    <section className="space-y-3" aria-labelledby="automation-events-heading">
      <div>
        <h2 id="automation-events-heading" className="text-sm font-semibold">
          Automation event explorer
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Persisted event signals in the active organization and exact location.
        </p>
      </div>
      <AutomationEventFilters
        filters={filters}
        options={data?.options ?? {
          eventTypes: [],
          workflows: [],
          sourceNodeTypes: [],
        }}
        onChange={setFilters}
      />
      {events.isLoading ? (
        <div className="h-28 py-10 text-center text-sm text-muted-foreground" role="status">
          Loading automation events...
        </div>
      ) : events.isError || !data ? (
        <div className="h-28 py-10 text-center text-sm text-destructive" role="alert">
          Automation events could not be loaded.
        </div>
      ) : (
        <>
          <AutomationEventExplorerTable items={data.items} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {data.totalCount.toLocaleString()} events | Page {data.page} of {Math.max(data.totalPages, 1)}
            </p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9"
                disabled={data.page <= 1}
                onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}
                aria-label="Previous automation event page"
                title="Previous page"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9"
                disabled={data.page >= data.totalPages}
                onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
                aria-label="Next automation event page"
                title="Next page"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
