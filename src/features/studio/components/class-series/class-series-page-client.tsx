"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnOrderState,
  VisibilityState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import {
  Ban,
  MoreHorizontal,
  Pause,
  Play,
  Repeat,
  Workflow,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClassViewSwitcher } from "@/features/studio/components/class-view-switcher";
import { StudioTableToolbar } from "@/features/studio/components/studio-table-toolbar";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";

const STATUS_VALUES = ["ACTIVE", "PAUSED", "CANCELLED"] as const;
const COLUMN_ORDER_KEY = "class-series.column-order";
const PRIMARY_COLUMN_ID = "series";
const ALL_SERVICES = "__all_services__";
const DEFAULT_COLUMN_ORDER = [
  "series",
  "instructors",
  "recurrence",
  "starts",
  "time",
  "service",
  "room",
  "occurrences",
  "status",
  "actions",
] as const;

type RouterOutput = inferRouterOutputs<AppRouter>;
type SeriesRow = RouterOutput["classSeries"]["list"][number];

function recurrenceLabel(rule: string): string {
  const parts = Object.fromEntries(
    rule.split(";").map((part) => {
      const [key, value = ""] = part.split("=");
      return [key, value];
    }),
  );
  const interval = parts.INTERVAL ?? "1";
  const frequency = parts.FREQ === "MONTHLY" ? "month" : "week";
  const count = parts.COUNT ? `, ${parts.COUNT} occurrences` : "";
  return `Every ${interval === "1" ? "" : `${interval} `}${frequency}${count}`;
}

function statusColor(status: string): string {
  if (status === "ACTIVE") return "#10b981";
  if (status === "PAUSED") return "#f59e0b";
  return "#f43f5e";
}

export function ClassSeriesPageClient() {
  const trpc = useTRPC();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedServiceTypeId = searchParams.get("serviceTypeId") ?? "";
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("name.asc");
  const [statuses, setStatuses] = React.useState<
    Array<(typeof STATUS_VALUES)[number]>
  >(["ACTIVE", "PAUSED"]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const listInput = React.useMemo(
    () => ({
      search: search || undefined,
      statuses,
      serviceTypeId: selectedServiceTypeId || undefined,
    }),
    [search, selectedServiceTypeId, statuses],
  );

  const seriesQuery = useQuery(trpc.classSeries.list.queryOptions(listInput));
  const servicesQuery = useQuery(
    trpc.serviceCatalog.list.queryOptions({ includeInactive: true }),
  );
  const permissionsQuery = useQuery(trpc.permissions.getCurrent.queryOptions());
  const canManageWorkflows = Boolean(
    permissionsQuery.data?.capabilities.includes("workflow.manage"),
  );
  const statusMutation = useMutation(
    trpc.classSeries.updateStatus.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.classSeries.list.queryOptions(listInput),
        );
        toast.success("Class series updated");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const createBookingAutomation = useMutation(
    trpc.workflows.create.mutationOptions({
      onSuccess: (workflow) => {
        toast.success("Series booking automation created");
        router.push(`/workflows/${workflow.id}`);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const rows = React.useMemo(() => {
    const [column, direction] = sort.split(".");
    const sortedRows = [...(seriesQuery.data ?? [])].sort((a, b) => {
      let comparison = 0;
      if (column === "name") comparison = a.name.localeCompare(b.name);
      if (column === "startDate") {
        comparison =
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      }
      if (column === "occurrences") {
        comparison = a.occurrenceCount - b.occurrenceCount;
      }
      if (column === "service") {
        comparison = (a.serviceTypeName ?? "").localeCompare(
          b.serviceTypeName ?? "",
        );
      }
      return direction === "desc" ? -comparison : comparison;
    });
    return sortedRows;
  }, [seriesQuery.data, sort]);

  const columns = React.useMemo<ColumnDef<SeriesRow>[]>(
    () => [
      {
        id: "series",
        accessorKey: "name",
        header: "Series",
        meta: { label: "Series" },
        enableHiding: false,
        cell: ({ row }) => (
          <p className="max-w-xs truncate font-medium text-primary">
            {row.original.name}
          </p>
        ),
      },
      {
        id: "instructors",
        header: "Instructors",
        meta: { label: "Instructors" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/65">
            {row.original.instructors.map((person) => person.name).join(", ") ||
              "No instructor"}
          </span>
        ),
      },
      {
        id: "recurrence",
        header: "Recurrence",
        meta: { label: "Recurrence" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/65">
            {recurrenceLabel(row.original.recurrenceRule)}
          </span>
        ),
      },
      {
        id: "starts",
        header: "Starts",
        meta: { label: "Starts" },
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-primary/65">
            {format(new Date(row.original.startDate), "MMM d, yyyy")}
          </span>
        ),
      },
      {
        id: "time",
        header: "Time",
        meta: { label: "Time" },
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-primary/65">
            {row.original.startTime} - {row.original.endTime}
          </span>
        ),
      },
      {
        id: "service",
        header: "Service",
        meta: { label: "Service" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/65">
            {row.original.serviceTypeName ?? "No service type"}
          </span>
        ),
      },
      {
        id: "room",
        header: "Room",
        meta: { label: "Room" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/65">
            {row.original.roomName ?? "No room"}
          </span>
        ),
      },
      {
        id: "occurrences",
        header: "Occurrences",
        meta: { label: "Occurrences" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/65">
            {row.original.occurrenceCount}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        meta: { label: "Status" },
        cell: ({ row }) => {
          const color = statusColor(row.original.status);
          return (
            <Badge
              variant="outline"
              className="text-[10px] capitalize ring-0"
              style={{
                backgroundColor: `${color}18`,
                borderColor: `${color}66`,
                color,
                boxShadow: `0 0 0 1px ${color}66`,
              }}
            >
              {row.original.status.toLowerCase()}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        meta: { label: "Actions" },
        enableHiding: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8"
                disabled={statusMutation.isPending}
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Open series actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>

              <DropdownMenuSeparator />
              {canManageWorkflows ? (
                <DropdownMenuItem
                  disabled={createBookingAutomation.isPending}
                  onClick={() =>
                    createBookingAutomation.mutate({
                      starter: {
                        event: "CLASS_SERIES_BOOKED",
                        classSeriesId: row.original.id,
                      },
                    })
                  }
                >
                  <Workflow className="size-3" /> Create booking automation
                </DropdownMenuItem>
              ) : null}
              {canManageWorkflows ? <DropdownMenuSeparator /> : null}
              {row.original.status !== "ACTIVE" && (
                <DropdownMenuItem
                  onClick={() =>
                    statusMutation.mutate({
                      id: row.original.id,
                      status: "ACTIVE",
                    })
                  }
                >
                  <Play className="size-3" />
                  Resume
                </DropdownMenuItem>
              )}
              {row.original.status === "ACTIVE" && (
                <DropdownMenuItem
                  onClick={() =>
                    statusMutation.mutate({
                      id: row.original.id,
                      status: "PAUSED",
                    })
                  }
                >
                  <Pause className="size-3" />
                  Pause
                </DropdownMenuItem>
              )}
              {row.original.status !== "CANCELLED" && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() =>
                    statusMutation.mutate({
                      id: row.original.id,
                      status: "CANCELLED",
                    })
                  }
                >
                  <Ban className="size-3" />
                  Cancel
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [canManageWorkflows, createBookingAutomation, statusMutation],
  );

  React.useEffect(() => {
    setColumnOrder([...DEFAULT_COLUMN_ORDER]);
    try {
      const stored = window.localStorage.getItem(COLUMN_ORDER_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setColumnOrder(
            parsed.filter((id): id is string => typeof id === "string"),
          );
        }
      }
    } catch {}
  }, []);

  const resolvedColumnOrder =
    columnOrder.length > 0 ? columnOrder : [...DEFAULT_COLUMN_ORDER];

  return (
    <div className="space-y-0">
      <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary">Class series</h1>
          <p className="text-xs text-primary/75">
            Manage recurring class templates and generated occurrences.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ClassViewSwitcher
            activeView="series"
            serviceTypeId={selectedServiceTypeId}
          />
          <Select
            value={selectedServiceTypeId || ALL_SERVICES}
            onValueChange={(value) => {
              router.replace(
                value === ALL_SERVICES
                  ? "/studio/class-series"
                  : `/studio/class-series?serviceTypeId=${encodeURIComponent(value)}`,
                { scroll: false },
              );
            }}
          >
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="All services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SERVICES}>All services</SelectItem>
              {(servicesQuery.data ?? []).map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <DataTable
        columns={columns}
        data={rows}
        isLoading={seriesQuery.isLoading}
        getRowId={(row) => row.id}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={(updater) =>
          setColumnVisibility(
            typeof updater === "function"
              ? (updater as (state: VisibilityState) => VisibilityState)(
                  columnVisibility,
                )
              : updater,
          )
        }
        columnOrder={resolvedColumnOrder}
        onColumnOrderChange={(order) => {
          setColumnOrder(order);
          try {
            window.localStorage.setItem(
              COLUMN_ORDER_KEY,
              JSON.stringify(order),
            );
          } catch {}
        }}
        initialColumnOrder={[...DEFAULT_COLUMN_ORDER]}
        enableGlobalSearch={false}
        toolbar={{
          filters: (ctx) => (
            <StudioTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search class series..."
              filterGroups={[
                {
                  label: "Status",
                  options: STATUS_VALUES.map((status) => ({
                    value: status,
                    label: status.toLowerCase(),
                  })),
                  selectedValues: statuses,
                  onChange: (values) =>
                    setStatuses(
                      values.filter(
                        (value): value is (typeof STATUS_VALUES)[number] =>
                          STATUS_VALUES.includes(
                            value as (typeof STATUS_VALUES)[number],
                          ),
                      ),
                    ),
                },
              ]}
              sortOptions={[
                { value: "name.asc", label: "Name A-Z" },
                { value: "name.desc", label: "Name Z-A" },
                { value: "startDate.asc", label: "Starts soonest" },
                { value: "startDate.desc", label: "Starts latest" },
                { value: "occurrences.desc", label: "Most occurrences" },
                { value: "occurrences.asc", label: "Fewest occurrences" },
                { value: "service.asc", label: "Service A-Z" },
                { value: "service.desc", label: "Service Z-A" },
              ]}
              sortValue={sort}
              onSortChange={setSort}
              table={ctx.table}
              columnVisibility={columnVisibility}
              columnOrder={resolvedColumnOrder}
              onColumnOrderChange={(order: ColumnOrderState) => {
                setColumnOrder(order);
                try {
                  window.localStorage.setItem(
                    COLUMN_ORDER_KEY,
                    JSON.stringify(order),
                  );
                } catch {}
              }}
              initialColumnOrder={[...DEFAULT_COLUMN_ORDER]}
              primaryColumnId={PRIMARY_COLUMN_ID}
            />
          ),
        }}
        emptyState={
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Repeat className="size-8 text-primary/20" />
            <p className="text-sm text-primary/50">
              No class series match this view.
            </p>
          </div>
        }
      />
    </div>
  );
}
