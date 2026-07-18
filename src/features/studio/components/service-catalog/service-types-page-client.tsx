"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnOrderState,
  VisibilityState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import {
  Archive,
  Boxes,
  CalendarDays,
  Clock3,
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  Repeat,
  Workflow,
  Trash2,
  ListChecks,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { StudioTableToolbar } from "@/features/studio/components/studio-table-toolbar";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { CategoryDialog } from "./category-dialog";
import {
  EXPERIENCE_OPTIONS,
  FORMAT_OPTIONS,
  PAYMENT_OPTIONS,
  VISIBILITY_OPTIONS,
} from "./constants";
import { formatServicePayment } from "./service-payment-format";
import { ServiceTypeHistorySheet } from "./service-type-history-sheet";

const COLUMN_ORDER_KEY = "service-types.column-order.v2";
const PRIMARY_COLUMN_ID = "name";
const DEFAULT_COLUMN_ORDER = [
  "name",
  "experience",
  "category",
  "reportingType",
  "payment",
  "access",
  "duration",
  "capacity",
  "linkedClasses",
  "actions",
] as const;

type RouterOutput = inferRouterOutputs<AppRouter>;
type ServiceTypeRow = RouterOutput["serviceCatalog"]["list"][number];

function experienceLabel(value: string): string {
  return EXPERIENCE_OPTIONS.find((opt) => opt.value === value)?.label ?? value;
}

function formatLabel(value: string): string {
  return FORMAT_OPTIONS.find((opt) => opt.value === value)?.label ?? value;
}

function visibilityLabel(value: string): string {
  return VISIBILITY_OPTIONS.find((opt) => opt.value === value)?.label ?? value;
}

export function ServiceTypesPageClient() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("name.asc");
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [experienceFilter, setExperienceFilter] = React.useState<string[]>([]);
  const [formatFilter, setFormatFilter] = React.useState<string[]>([]);
  const [paymentFilter, setPaymentFilter] = React.useState<string[]>([]);
  const [visibilityFilter, setVisibilityFilter] = React.useState<string[]>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = React.useState(false);
  const [archivingService, setArchivingService] = React.useState<ServiceTypeRow | null>(null);
  const [deletingService, setDeletingService] = React.useState<ServiceTypeRow | null>(null);
  const [historyService, setHistoryService] = React.useState<ServiceTypeRow | null>(null);

  const servicesQuery = useQuery(
    trpc.serviceCatalog.list.queryOptions({ includeInactive: true }),
  );
  const archiveOption = useMutation(
    trpc.serviceCatalog.archive.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.serviceCatalog.list.queryOptions({ includeInactive: true }),
        );
        toast.success("Service type archived");
        setArchivingService(null);
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const duplicateOption = useMutation(
    trpc.serviceCatalog.duplicate.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.serviceCatalog.list.queryOptions({ includeInactive: true }),
        );
        toast.success("Service type duplicated as an archived copy");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const deleteOption = useMutation(
    trpc.serviceCatalog.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.serviceCatalog.list.queryOptions({ includeInactive: true }),
        );
        setDeletingService(null);
        toast.success("Service type deleted");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const services = React.useMemo(() => {
    let rows = servicesQuery.data ?? [];

    if (statusFilter.length > 0) {
      rows = rows.filter((service) =>
        statusFilter.includes(service.isActive ? "active" : "inactive"),
      );
    }
    if (experienceFilter.length > 0) {
      rows = rows.filter((service) =>
        experienceFilter.includes(service.experienceType),
      );
    }
    if (formatFilter.length > 0) {
      rows = rows.filter((service) =>
        formatFilter.includes(service.format),
      );
    }
    if (paymentFilter.length > 0) {
      rows = rows.filter((service) =>
        paymentFilter.includes(service.paymentType),
      );
    }
    if (visibilityFilter.length > 0) {
      rows = rows.filter((service) =>
        visibilityFilter.includes(service.visibility),
      );
    }
    if (search.trim()) {
      const query = search.toLowerCase();
      rows = rows.filter((service) =>
        [
          service.name,
          service.categoryName,
          service.classTypeName,
          service.revenueCategory,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(query)),
      );
    }

    const [column, direction] = sort.split(".");
    rows = [...rows].sort((a, b) => {
      let comparison = 0;
      if (column === "name") comparison = a.name.localeCompare(b.name);
      if (column === "experience") comparison = a.experienceType.localeCompare(b.experienceType);
      if (column === "category") comparison = (a.categoryName ?? "").localeCompare(b.categoryName ?? "");
      if (column === "reportingType") comparison = (a.classTypeName ?? "").localeCompare(b.classTypeName ?? "");
      if (column === "duration") comparison = a.durationMinutes - b.durationMinutes;
      if (column === "classes") comparison = a.studioClassCount - b.studioClassCount;
      return direction === "desc" ? -comparison : comparison;
    });

    return rows;
  }, [
    experienceFilter,
    formatFilter,
    paymentFilter,
    search,
    servicesQuery.data,
    sort,
    statusFilter,
    visibilityFilter,
  ]);

  const columns = React.useMemo<ColumnDef<ServiceTypeRow>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Service type",
        meta: { label: "Service type" },
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{
                backgroundColor:
                  row.original.calendarColor ??
                  row.original.categoryColor ??
                  "#6366f1",
              }}
            />
            <div className="space-y-1">
              <Link
                href={`/studio/class-series?serviceTypeId=${encodeURIComponent(row.original.id)}`}
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                {row.original.name}
              </Link>
            </div>
          </div>
        ),
      },
      {
        id: "reportingType",
        accessorFn: (row) => row.classTypeName ?? "",
        header: "Reporting type",
        meta: { label: "Reporting type" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/65">
            {row.original.classTypeName ?? (
              <span className="text-primary/40">Not set</span>
            )}
          </span>
        ),
      },
      {
        id: "experience",
        accessorKey: "experienceType",
        header: "Experience",
        meta: { label: "Experience" },
        cell: ({ row }) => {
          const color =
            row.original.calendarColor ??
            row.original.categoryColor ??
            "#6366f1";
          return (
            <Badge
              variant="outline"
              className="max-w-44 truncate text-[10px] ring-0"
              style={{
                backgroundColor: `${color}18`,
                borderColor: `${color}66`,
                color,
                boxShadow: `0 0 0 1px ${color}66`,
              }}
            >
              {experienceLabel(row.original.experienceType)}
            </Badge>
          );
        },
      },
      {
        id: "category",
        accessorFn: (row) => row.categoryName ?? "Uncategorised",
        header: "Category",
        meta: { label: "Category" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/65">
            {row.original.categoryName ?? (
              <span className="text-primary/40">Uncategorised</span>
            )}
          </span>
        ),
      },
      {
        id: "payment",
        header: "Payment",
        meta: { label: "Payment" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/65">
            {formatServicePayment(row.original)}
          </span>
        ),
      },
      {
        id: "access",
        header: "Access",
        meta: { label: "Access" },
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="text-xs text-primary/65">
              {visibilityLabel(row.original.visibility)}
            </p>
            {(row.original.bookingRestrictionTags ?? []).length > 0 && (
              <p className="text-[11px] text-primary/40">
                {(row.original.bookingRestrictionTags ?? []).length} tag rules
              </p>
            )}
          </div>
        ),
      },
      {
        id: "duration",
        accessorKey: "durationMinutes",
        header: "Duration",
        meta: { label: "Duration" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/65">
            {row.original.durationMinutes} min
          </span>
        ),
      },
      {
        id: "capacity",
        accessorKey: "capacity",
        header: "Capacity",
        meta: { label: "Capacity" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/65">
            {row.original.capacity ?? "-"}
          </span>
        ),
      },
      {
        id: "linkedClasses",
        accessorFn: (row) => row.studioClassCount,
        header: "Linked classes",
        meta: { label: "Linked classes" },
        cell: ({ row }) => (
          <Link
            href={`/studio/schedule?serviceTypeId=${encodeURIComponent(row.original.id)}`}
            className="text-xs text-primary/65 underline-offset-4 hover:text-primary hover:underline"
          >
            {row.original.studioClassCount}
          </Link>
        ),
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="size-8">
                <span className="sr-only">Open service type actions</span>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href={`/studio/class-series?serviceTypeId=${encodeURIComponent(row.original.id)}`}
                  className="cursor-pointer text-xs"
                >
                  <Repeat className="size-3.5" /> View class series
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/studio/schedule?serviceTypeId=${encodeURIComponent(row.original.id)}`}
                  className="cursor-pointer text-xs"
                >
                  <CalendarDays className="size-3.5" /> View schedule
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/workflows?studioEvent=CLASS_BOOKED&serviceTypeId=${encodeURIComponent(row.original.id)}&resourceName=${encodeURIComponent(row.original.name)}`}
                  className="cursor-pointer text-xs"
                >
                  <Workflow className="size-3.5" /> Create booking automation
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/studio/service-types/${row.original.id}/edit`}
                  className="cursor-pointer text-xs"
                >
                  <Pencil className="size-3.5" /> Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-xs"
                disabled={duplicateOption.isPending}
                onSelect={() => duplicateOption.mutate({ id: row.original.id })}
              >
                <Copy className="size-3.5" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-xs" onSelect={() => setHistoryService(row.original)}>
                <Clock3 className="size-3.5" /> View change history
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-xs text-amber-600 focus:text-amber-600"
                disabled={!row.original.isActive || archiveOption.isPending}
                onSelect={() => setArchivingService(row.original)}
              >
                <Archive className="size-3.5" /> Archive
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-xs text-destructive focus:text-destructive"
                onSelect={() => setDeletingService(row.original)}
              >
                <Trash2 className="size-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [archiveOption.isPending, duplicateOption],
  );

  React.useEffect(() => {
    setColumnOrder([...DEFAULT_COLUMN_ORDER]);
    try {
      const stored = window.localStorage.getItem(COLUMN_ORDER_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setColumnOrder(
            parsed.filter((item): item is string => typeof item === "string"),
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
          <h1 className="text-lg font-semibold text-primary">Service types</h1>
          <p className="text-xs text-primary/70">
            Manage classes, privates, events, booking defaults, access rules, and checkout copy.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCategoryDialogOpen(true)}>
            <Boxes className="size-3.5" />
            Add category
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/studio/service-types/new">
              <Plus className="size-3.5" />
              Add service
            </Link>
          </Button>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <DataTable
        columns={columns}
        data={services}
        isLoading={servicesQuery.isLoading}
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
            window.localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(order));
          } catch {}
        }}
        initialColumnOrder={[...DEFAULT_COLUMN_ORDER]}
        enableGlobalSearch={false}
        toolbar={{
          filters: (ctx) => (
            <StudioTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search service types..."
              filterGroups={[
                {
                  label: "Status",
                  options: [
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ],
                  selectedValues: statusFilter,
                  onChange: setStatusFilter,
                },
                {
                  label: "Experience",
                  options: EXPERIENCE_OPTIONS.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                  })),
                  selectedValues: experienceFilter,
                  onChange: setExperienceFilter,
                },
                {
                  label: "Format",
                  options: FORMAT_OPTIONS.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                  })),
                  selectedValues: formatFilter,
                  onChange: setFormatFilter,
                },
                {
                  label: "Payment",
                  options: PAYMENT_OPTIONS.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                  })),
                  selectedValues: paymentFilter,
                  onChange: setPaymentFilter,
                },
                {
                  label: "Visibility",
                  options: VISIBILITY_OPTIONS.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                  })),
                  selectedValues: visibilityFilter,
                  onChange: setVisibilityFilter,
                },
              ]}
              sortOptions={[
                { value: "name.asc", label: "Name A-Z" },
                { value: "name.desc", label: "Name Z-A" },
                { value: "experience.asc", label: "Experience A-Z" },
                { value: "experience.desc", label: "Experience Z-A" },
                { value: "category.asc", label: "Category A-Z" },
                { value: "category.desc", label: "Category Z-A" },
                { value: "reportingType.asc", label: "Reporting type A-Z" },
                { value: "reportingType.desc", label: "Reporting type Z-A" },
                { value: "duration.asc", label: "Duration low-high" },
                { value: "duration.desc", label: "Duration high-low" },
                { value: "classes.desc", label: "Most linked classes" },
                { value: "classes.asc", label: "Fewest linked classes" },
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
            <ListChecks className="size-8 text-primary/20" />
            <p className="text-sm text-primary/50">
              No service types match this view.
            </p>
          </div>
        }
      />

      <CategoryDialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen} />

      <AlertDialog
        open={Boolean(archivingService)}
        onOpenChange={(open) => !open && setArchivingService(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to archive this service type?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Existing classes keep their service information, but this service type will no longer be available for new scheduling.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={archiveOption.isPending}
              onClick={() => {
                if (archivingService) archiveOption.mutate({ id: archivingService.id });
              }}
            >
              {archiveOption.isPending ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deletingService)}
        onOpenChange={(open) => !open && setDeletingService(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service type?</AlertDialogTitle>
            <AlertDialogDescription>
              Only archived service types with no linked classes, series, or pricing rules can be deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteOption.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingService) deleteOption.mutate({ id: deletingService.id });
              }}
            >
              {deleteOption.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ServiceTypeHistorySheet
        service={historyService}
        onOpenChange={(open) => !open && setHistoryService(null)}
      />
    </div>
  );
}
