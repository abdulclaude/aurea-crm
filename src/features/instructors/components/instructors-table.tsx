"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnOrderState,
  SortingState,
  Updater,
  VisibilityState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import {
  Edit,
  Eye,
  Link as LinkIcon,
  MoreHorizontal,
  Send,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { useQueryState, parseAsString } from "nuqs";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import {
  useDeleteInstructor,
  useGenerateMagicLink,
  useSendMagicLinkEmail,
} from "../hooks/use-instructors";
import { useInstructorsParams } from "../hooks/use-instructors-params";
import { EditInstructorDialog } from "./edit-instructor-dialog";
import { InstructorsToolbar } from "./instructors-toolbar";

type RouterOutput = inferRouterOutputs<AppRouter>;
type InstructorRow = RouterOutput["instructors"]["list"]["items"][number];

const SORTABLE_COLUMNS = new Set(["createdAt", "name", "hourlyRate"]);

const INSTRUCTORS_DEFAULT_SORT = "createdAt.desc";

const FIXED_COLUMNS = ["select", "name"];

const sortValueToState = (value?: string): SortingState => {
  const sort = value || INSTRUCTORS_DEFAULT_SORT;
  const [column, direction] = sort.split(".");
  if (!SORTABLE_COLUMNS.has(column)) {
    return [];
  }
  return [
    {
      id: column,
      desc: direction === "desc",
    },
  ];
};

const sortingStateToValue = (state: SortingState): string | null => {
  const primary = state[0];
  if (!primary || !SORTABLE_COLUMNS.has(primary.id)) {
    return null;
  }
  return `${primary.id}.${primary.desc ? "desc" : "asc"}`;
};

const instructorColumns: ColumnDef<InstructorRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "name",
    accessorKey: "name",
    header: "Name",
    meta: { label: "Name" },
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-xs">{row.original.name}</p>
      </div>
    ),
    enableHiding: false, // ← cannot hide
    enableSorting: false,
    enableColumnFilter: false,
    enableResizing: false,
  },
  {
    id: "email",
    accessorKey: "email",
    header: "Email",
    meta: { label: "Email" },
    cell: ({ row }) => (
      <p className="text-xs text-primary/70">{row.original.email || "—"}</p>
    ),
  },
  {
    id: "phone",
    accessorKey: "phone",
    header: "Phone",
    meta: { label: "Phone" },
    cell: ({ row }) => (
      <p className="text-xs text-primary/70">{row.original.phone || "—"}</p>
    ),
  },
  {
    id: "hourlyRate",
    accessorKey: "hourlyRate",
    header: "Rate",
    meta: { label: "Hourly Rate" },
    enableSorting: true,
    cell: ({ row }) => {
      const rate = Number(row.original.hourlyRate ?? 0);
      if (!Number.isFinite(rate) || rate <= 0) {
        return <span className="text-primary/40">—</span>;
      }
      return (
        <p className="text-xs font-medium">
          {new Intl.NumberFormat("en-GB", {
            style: "currency",
            currency: row.original.currency || "GBP",
          }).format(rate)}
          /hr
        </p>
      );
    },
  },
  {
    id: "isActive",
    accessorKey: "isActive",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={cn(
          "text-xs",
          row.original.isActive
            ? "bg-emerald-400/20 text-emerald-500 ring ring-emerald-400 border-none shadow-sm px-3"
            : "bg-rose-400/20 text-rose-500 ring ring-rose-400 border-none shadow-sm px-3",
        )}
      >
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    id: "lastLoginAt",
    accessorKey: "lastLoginAt",
    header: "Last Login",
    meta: { label: "Last Login" },
    cell: ({ row }) => {
      if (!row.original.lastLoginAt) {
        return <span className="text-xs text-primary/40">Never</span>;
      }
      return (
        <span className="text-xs text-primary/60">
          {format(new Date(row.original.lastLoginAt), "MMM d, h:mm a")}
        </span>
      );
    },
  },
  {
    id: "timeLog",
    accessorKey: "_count.timeLog",
    header: "Logs",
    meta: { label: "Time logs" },
    cell: ({ row }) => (
      <span className="text-xs font-medium">
        {row.original._count?.timeLog || 0}
      </span>
    ),
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Created at",
    meta: { label: "Created at" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-primary dark:text-white/60">
        {format(new Date(row.original.createdAt), "MMM d, yy")}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => <InstructorActionsCell row={row} />,
    enableSorting: false,
    enableHiding: false,
  },
];

// const PRIMARY_COLUMN_ID = "select";
const INSTRUCTOR_COLUMN_IDS = instructorColumns.map(
  (column, index) => (column.id ?? `column-${index}`) as string,
);
const COLUMN_ORDER_STORAGE_KEY = "instructors-table.column-order";

function InstructorActionsCell({ row }: { row: { original: InstructorRow } }) {
  const [editingInstructor, setEditingInstructor] = React.useState<InstructorRow | null>(
    null,
  );
  const { mutate: deleteInstructor } = useDeleteInstructor();
  const { mutate: generateMagicLink } = useGenerateMagicLink();
  const { mutate: sendMagicLinkEmail } = useSendMagicLinkEmail();

  const handleDelete = (id: string, name: string) => {
    if (
      confirm(
        `Are you sure you want to delete ${name}? This will also delete all their time logs.`,
      )
    ) {
      deleteInstructor(
        { id },
        {
          onSuccess: () => {
            toast.success("Instructor deleted successfully");
          },
          onError: (error) => {
            toast.error(error.message || "Failed to delete instructor");
          },
        },
      );
    }
  };

  const handleGenerateMagicLink = (instructorId: string, name: string) => {
    generateMagicLink(
      { instructorId },
      {
        onSuccess: (data) => {
          navigator.clipboard.writeText(data.magicLink);
          toast.success(`Magic link copied to clipboard for ${name}`, {
            description: `Link expires ${format(data.expiresAt, "PPp")}`,
          });
        },
        onError: (error) => {
          toast.error(error.message || "Failed to generate magic link");
        },
      },
    );
  };

  const handleSendEmail = (
    instructorId: string,
    name: string,
    email?: string | null,
  ) => {
    if (!email) {
      toast.error("Instructor does not have an email address");
      return;
    }

    sendMagicLinkEmail(
      { instructorId },
      {
        onSuccess: () => {
          toast.success(`Magic link sent to ${email}`, {
            description: `${name} can now access the instructor dashboard`,
          });
        },
        onError: (error) => {
          toast.error(error.message || "Failed to send email");
        },
      },
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="size-8 p-0 hover:bg-primary/5"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-background border-black/5 dark:border-white/5"
        >
          <DropdownMenuLabel className="text-xs text-primary/80 dark:text-white/50">
            Actions
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />
          <DropdownMenuItem
            className="text-xs dark:text-white text-primary hover:text-black hover:bg-primary-foreground cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = `/instructors/${row.original.id}`;
            }}
          >
            <Eye className="mr-0.5 size-3.5" />
            View details
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />
          <DropdownMenuItem
            className="text-xs dark:text-white text-primary hover:text-black hover:bg-primary-foreground cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleSendEmail(
                row.original.id,
                row.original.name,
                row.original.email,
              );
            }}
            disabled={!row.original.email}
          >
            <Send className="mr-0.5 size-3.5" />
            Send login email
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-xs dark:text-white text-primary hover:text-black hover:bg-primary-foreground cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleGenerateMagicLink(row.original.id, row.original.name);
            }}
          >
            <LinkIcon className="mr-0.5 size-3.5" />
            Copy magic link
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />
          <DropdownMenuItem
            className="text-xs dark:text-white text-primary hover:text-black hover:bg-primary-foreground cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setEditingInstructor(row.original);
            }}
          >
            <Edit className="mr-0.5 size-3.5" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-xs text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.original.id, row.original.name);
            }}
          >
            <Trash2 className="mr-0.5 size-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {editingInstructor && (
        <EditInstructorDialog
          instructor={editingInstructor}
          open={!!editingInstructor}
          onOpenChange={(open) => {
            if (!open) setEditingInstructor(null);
          }}
          onSuccess={() => {
            setEditingInstructor(null);
          }}
        />
      )}
    </>
  );
}

// Helper functions for column management
function normalizeColumnOrder(order: string[], defaults: string[]) {
  const fixed = ["select", "name"];
  const seen = new Set<string>();
  const next: string[] = [];

  // Always enforce fixed order first
  for (const id of fixed) {
    if (defaults.includes(id)) {
      seen.add(id);
      next.push(id);
    }
  }

  // Add user-selected order, excluding fixed columns
  for (const id of order) {
    if (!defaults.includes(id)) continue;
    if (fixed.includes(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }

  // Add any missing columns
  for (const id of defaults) {
    if (fixed.includes(id)) continue;
    if (!seen.has(id)) {
      seen.add(id);
      next.push(id);
    }
  }

  return next;
}

function resolveUpdater<T>(updater: Updater<T>, previous: T): T {
  return typeof updater === "function"
    ? (updater as (input: T) => T)(previous)
    : updater;
}

function shallowEqualArrays(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function visibilityFromHidden(hidden: string[]): VisibilityState {
  if (!hidden?.length) return {};
  return hidden.reduce<VisibilityState>((acc, columnId) => {
    acc[columnId] = false;
    return acc;
  }, {});
}

function normalizeHiddenColumns(columns: string[]): string[] {
  return [...columns].sort();
}

type InstructorsTableProps = {
  scope?: "agency" | "all-clients";
};

export function InstructorsTable({ scope = "agency" }: InstructorsTableProps) {
  const trpc = useTRPC();
  const [params, setParams] = useInstructorsParams();
  const [rowSelection, setRowSelection] = React.useState({});

  // Client filter for "all-clients" scope (agency viewing all client data)
  const [selectedLocationId, setSelectedLocationId] = useQueryState(
    "locationId",
    parseAsString.withDefault(""),
  );

  const { data, isFetching } = useSuspenseQuery(
    trpc.instructors.list.queryOptions({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search || undefined,
      roles: params.roles && params.roles.length > 0 ? params.roles : undefined,
      isActive: params.isActive ?? undefined,
      rateMin: params.rateMin ?? undefined,
      rateMax: params.rateMax ?? undefined,
      createdAfter: params.createdAfter
        ? new Date(params.createdAfter)
        : undefined,
      createdBefore: params.createdBefore
        ? new Date(params.createdBefore)
        : undefined,
      // For "all-clients" scope, pass the selected location filter
      ...(scope === "all-clients" && {
        includeAllClients: !selectedLocationId, // If no specific client selected, show all
        locationId: selectedLocationId || undefined, // If client selected, filter by it
      }),
    }),
  );

  const instructors = data?.items || [];

  const sortingState = React.useMemo(
    () => sortValueToState(params.sort),
    [params.sort],
  );

  const hiddenColumns = React.useMemo(
    () => normalizeHiddenColumns(params.hiddenColumns ?? []),
    [params.hiddenColumns],
  );

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => visibilityFromHidden(hiddenColumns));

  const pendingHiddenRef = React.useRef<string[] | null>(null);

  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(INSTRUCTOR_COLUMN_IDS);

  const persistColumnOrder = React.useCallback((order: string[]) => {
    if (typeof window === "undefined") {
      return;
    }
    const next = normalizeColumnOrder(order, INSTRUCTOR_COLUMN_IDS);

    if (shallowEqualArrays(next, INSTRUCTOR_COLUMN_IDS)) {
      window.localStorage.removeItem(COLUMN_ORDER_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(next));
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(COLUMN_ORDER_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const next = normalizeColumnOrder(parsed, INSTRUCTOR_COLUMN_IDS);

        setColumnOrder(next);
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    if (
      pendingHiddenRef.current &&
      shallowEqualArrays(pendingHiddenRef.current, hiddenColumns)
    ) {
      pendingHiddenRef.current = null;
      return;
    }
    setColumnVisibility(visibilityFromHidden(hiddenColumns));
  }, [hiddenColumns]);

  const handleSortingChange = React.useCallback(
    (state: SortingState) => {
      const nextValue = sortingStateToValue(state) ?? INSTRUCTORS_DEFAULT_SORT;
      setParams((prev) => ({ ...prev, sort: nextValue }));
    },
    [setParams],
  );

  const handleSearchChange = React.useCallback(
    (search: string) => {
      setParams((prev) => ({ ...prev, search, page: 1 }));
    },
    [setParams],
  );

  const handleSortChange = React.useCallback(
    (value: string) => {
      setParams((prev) => ({ ...prev, sort: value }));
    },
    [setParams],
  );

  const handleApplyFilters = React.useCallback(
    (filters: {
      roles: string[];
      status: boolean | null;
      rateMin?: number;
      rateMax?: number;
    }) => {
      setParams((prev) => ({
        ...prev,
        page: 1, // Reset to page 1 on filter change
        roles: filters.roles,
        isActive: filters.status,
        rateMin: filters.rateMin ?? null,
        rateMax: filters.rateMax ?? null,
      }));
    },
    [setParams],
  );

  const handleDateRangeChange = React.useCallback(
    (start?: Date, end?: Date) => {
      setParams((prev) => ({
        ...prev,
        page: 1, // Reset to page 1 on filter change
        createdAfter: start ? start.toISOString() : "",
        createdBefore: end ? end.toISOString() : "",
      }));
    },
    [setParams],
  );

  const handlePageChange = React.useCallback(
    (newPage: number) => {
      setParams((prev) => ({ ...prev, page: newPage }));
    },
    [setParams],
  );

  const handlePageSizeChange = React.useCallback(
    (newPageSize: number) => {
      setParams((prev) => ({ ...prev, pageSize: newPageSize, page: 1 }));
    },
    [setParams],
  );

  const handleColumnVisibilityChange = React.useCallback(
    (state: VisibilityState) => {
      const nextState = { ...state };
      setColumnVisibility(nextState);
      const nextHidden = Object.entries(nextState)
        .filter(([, visible]) => visible === false)
        .map(([id]) => id);
      const normalizedHidden = normalizeHiddenColumns(nextHidden);
      pendingHiddenRef.current = normalizedHidden;
      setParams((prev) => ({ ...prev, hiddenColumns: normalizedHidden }));
    },
    [setParams],
  );

  const handleColumnOrderChange = React.useCallback(
    (updater: Updater<ColumnOrderState>) => {
      setColumnOrder((previous) => {
        const resolved = resolveUpdater(updater, previous);
        const next = normalizeColumnOrder(resolved, INSTRUCTOR_COLUMN_IDS);

        persistColumnOrder(next);
        return next;
      });
    },
    [persistColumnOrder],
  );

  return (
    <div className="space-y-4">
      <DataTable
        data={instructors}
        columns={instructorColumns}
        isLoading={isFetching}
        getRowId={(row) => row.id}
        sorting={sortingState}
        onSortingChange={handleSortingChange}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        columnOrder={columnOrder}
        onColumnOrderChange={handleColumnOrderChange}
        initialColumnOrder={INSTRUCTOR_COLUMN_IDS}
        initialSorting={[{ id: "createdAt", desc: true }]}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        toolbar={{
          filters: (ctx) => (
            <InstructorsToolbar
              search={params.search || ""}
              onSearchChange={handleSearchChange}
              sortValue={params.sort || INSTRUCTORS_DEFAULT_SORT}
              onSortChange={handleSortChange}
              table={ctx.table}
              columnVisibility={columnVisibility}
              columnOrder={columnOrder}
              onColumnOrderChange={handleColumnOrderChange}
              initialColumnOrder={INSTRUCTOR_COLUMN_IDS}
              selectedRoles={params.roles || []}
              selectedStatus={params.isActive ?? null}
              selectedRateMin={params.rateMin ?? undefined}
              selectedRateMax={params.rateMax ?? undefined}
              startDate={
                params.createdAfter ? new Date(params.createdAfter) : undefined
              }
              endDate={
                params.createdBefore
                  ? new Date(params.createdBefore)
                  : undefined
              }
              onApplyAllFilters={handleApplyFilters}
              onStartDateChange={handleDateRangeChange}
              scope={scope}
              selectedLocationId={selectedLocationId}
              onLocationIdChange={setSelectedLocationId}
            />
          ),
        }}
        pagination={{
          currentPage: data.pagination.currentPage,
          totalPages: data.pagination.totalPages,
          pageSize: data.pagination.pageSize,
          totalItems: data.pagination.totalItems,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
      />
    </div>
  );
}
