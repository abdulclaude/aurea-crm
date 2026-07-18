"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnOrderState,
  RowSelectionState,
  SortingState,
  Updater,
  VisibilityState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format, formatDistanceToNow } from "date-fns";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TABLE_BADGE_COLORS, TableBadge } from "@/components/ui/table-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TagsDisplay } from "@/components/ui/tags-input";
import {
  formatDateValue,
  parseDateValue,
} from "@/components/ui/date-picker-utils";
import { CLIENTS_DEFAULT_SORT } from "@/features/crm/clients/constants";
import { useClientsParams } from "@/features/crm/clients/hooks/use-clients-params";
import {
  isClientSegment,
  type ClientSegment,
} from "@/features/crm/clients/segments";
import { ClientType } from "@/db/enums";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { ClientSegmentTabs } from "./client-segment-tabs";
import { ClientsBulkToolbar } from "./clients-bulk-toolbar";
import { ClientsToolbar } from "./clients-toolbar";
import { DeleteClientsDialog } from "./delete-clients-dialog";
import {
  exportClientsCsv,
  exportClientsPdf,
} from "@/features/crm/lib/client-export";

type RouterOutput = inferRouterOutputs<AppRouter>;
type ClientRow = RouterOutput["clients"]["list"]["items"][number];

const SORTABLE_COLUMNS = new Set([
  "name",
  "companyName",
  "createdAt",
  "updatedAt",
]);

const sortValueToState = (value?: string): SortingState => {
  const sort = value || CLIENTS_DEFAULT_SORT;
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

type ClientColumnActions = {
  canManage: boolean;
  onDelete: (client: ClientRow) => void;
};

function createClientColumns({
  canManage,
  onDelete,
}: ClientColumnActions): ColumnDef<ClientRow>[] {
  return [
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
      accessorFn: (row) => row.name,
      header: "Member",
      meta: { label: "Member" },
      enableHiding: false,
      enableSorting: true,
      cell: ({ row }) => {
        const client = row.original;
        const initials = client.name
          .split(" ")
          .map((part: string) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              {client.logo ? (
                <AvatarImage
                  src={client.logo}
                  alt={client.name}
                  className="object-cover"
                />
              ) : (
                <AvatarFallback className="bg-muted text-muted-foreground text-[11px]">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-medium text-primary dark:text-white">
                {client.name}
              </p>
              <p className="text-[11px] text-primary/60 dark:text-white/50">
                {client.email ?? "—"}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "type",
      accessorKey: "type",
      header: "Type",
      meta: { label: "Type" },
      cell: ({ row }) => {
        const typeColors: Record<string, string> = {
          LEAD: TABLE_BADGE_COLORS.amber,
          PROSPECT: TABLE_BADGE_COLORS.blue,
          CUSTOMER: TABLE_BADGE_COLORS.teal,
          CHURN: TABLE_BADGE_COLORS.rose,
        };
        return (
          <TableBadge
            color={typeColors[row.original.type] ?? TABLE_BADGE_COLORS.slate}
            className="capitalize"
          >
            {row.original.type.toLowerCase()}
          </TableBadge>
        );
      },
    },
    {
      id: "tags",
      accessorKey: "tags",
      header: "Tags",
      meta: { label: "Tags" },
      cell: ({ row }) => <TagsDisplay tags={row.original.tags ?? []} />,
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
      id: "lastInteractionAt",
      accessorKey: "lastInteractionAt",
      header: "Last activity",
      meta: { label: "Last activity" },
      cell: ({ row }) => (
        <span className="text-xs text-primary/80 dark:text-white/60">
          {row.original.lastInteractionAt
            ? formatDistanceToNow(new Date(row.original.lastInteractionAt), {
                addSuffix: true,
              })
            : "Never"}
        </span>
      ),
    },

    {
      id: "updatedAt",
      accessorKey: "updatedAt",
      header: "Last updated",
      meta: { label: "Last updated" },
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-xs text-primary/80 dark:text-white/60">
          {format(new Date(row.original.updatedAt), "MMM d, yy 'at' HH:mm")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        return (
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
              className="bg-background border-black/5 dark:border-white/5 space-y-0.5"
            >
              <DropdownMenuItem asChild>
                <Link
                  href={`/clients/${row.original.id}`}
                  className="cursor-pointer text-xs"
                >
                  <Eye className="size-3.5" />
                  View details
                </Link>
              </DropdownMenuItem>

              {canManage ? (
                <DropdownMenuItem asChild>
                  <Link
                    href={`/clients/${row.original.id}?edit=1`}
                    className="cursor-pointer text-xs"
                  >
                    <Pencil className="size-3.5" />
                    Edit member
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="text-xs" disabled>
                  <Pencil className="size-3.5" />
                  Edit member
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-xs text-destructive focus:text-destructive"
                disabled={!canManage}
                onSelect={() => onDelete(row.original)}
              >
                <Trash2 className="size-3.5" />
                Delete member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

const PRIMARY_COLUMN_ID = "name";
const CLIENT_COLUMN_IDS = [
  "select",
  "name",
  "type",
  "tags",
  "createdAt",
  "lastInteractionAt",
  "updatedAt",
  "actions",
];
const COLUMN_ORDER_STORAGE_KEY = "clients-table.column-order";

type ClientsTableProps = {
  canExport?: boolean;
  canManage?: boolean;
  scope?: "agency" | "all-clients";
  clientView?: "members" | "leads" | "all";
};

export function ClientsTable({
  canExport = false,
  canManage = false,
  scope = "agency",
  clientView = "all",
}: ClientsTableProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [params, setParams] = useClientsParams();

  // Pagination state
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [pageSize, setPageSize] = useQueryState(
    "pageSize",
    parseAsInteger.withDefault(20),
  );

  // Client filter for "all-clients" scope (agency viewing all client data)
  const [selectedLocationId, setSelectedLocationId] = useQueryState(
    "locationId",
    parseAsString.withDefault(""),
  );
  const [segmentParam, setSegmentParam] = useQueryState(
    "segment",
    parseAsString.withDefault("all"),
  );
  const segment: ClientSegment = isClientSegment(segmentParam)
    ? segmentParam
    : "all";

  // Separate query state hooks for date parameters (using parseAsString like profitableedge)
  const [createdAtStartStr, setCreatedAtStartStr] = useQueryState(
    "createdAtStart",
    parseAsString.withDefault(""),
  );
  const [createdAtEndStr, setCreatedAtEndStr] = useQueryState(
    "createdAtEnd",
    parseAsString.withDefault(""),
  );
  const [lastActivityStartStr, setLastActivityStartStr] = useQueryState(
    "lastActivityStart",
    parseAsString.withDefault(""),
  );
  const [lastActivityEndStr, setLastActivityEndStr] = useQueryState(
    "lastActivityEnd",
    parseAsString.withDefault(""),
  );
  const [updatedAtStartStr, setUpdatedAtStartStr] = useQueryState(
    "updatedAtStart",
    parseAsString.withDefault(""),
  );
  const [updatedAtEndStr, setUpdatedAtEndStr] = useQueryState(
    "updatedAtEnd",
    parseAsString.withDefault(""),
  );

  const createdAtStart = parseDateValue(createdAtStartStr);
  const createdAtEnd = parseDateValue(createdAtEndStr);
  const lastActivityStart = parseDateValue(lastActivityStartStr);
  const lastActivityEnd = parseDateValue(lastActivityEndStr);
  const updatedAtStart = parseDateValue(updatedAtStartStr);
  const updatedAtEnd = parseDateValue(updatedAtEndStr);

  const { data, isFetching } = useSuspenseQuery(
    trpc.clients.list.queryOptions({
      page,
      pageSize,
      segment,
      search: params.search || undefined,
      types:
        params.types.length > 0
          ? (params.types as ClientType[])
          : clientView === "leads"
            ? [ClientType.LEAD, ClientType.PROSPECT]
            : clientView === "members"
              ? [ClientType.CUSTOMER, ClientType.CHURN]
              : undefined,
      tags: params.tags.length > 0 ? params.tags : undefined,
      createdAtStart: createdAtStart || undefined,
      createdAtEnd: createdAtEnd || undefined,
      lastActivityStart: lastActivityStart || undefined,
      lastActivityEnd: lastActivityEnd || undefined,
      updatedAtStart: updatedAtStart || undefined,
      updatedAtEnd: updatedAtEnd || undefined,
      // For "all-clients" scope, pass the selected location filter
      ...(scope === "all-clients" && {
        includeAllClients: !selectedLocationId, // If no specific client selected, show all
        locationId: selectedLocationId || undefined, // If client selected, filter by it
      }),
    }),
  );

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [deleteTargets, setDeleteTargets] = React.useState<ClientRow[]>([]);

  const handleRowClick = React.useCallback(
    (client: ClientRow) => {
      router.push(`/clients/${client.id}`);
    },
    [router],
  );

  const sortingState = React.useMemo(
    () => sortValueToState(params.sort),
    [params.sort],
  );
  const searchValue = params.search ?? "";
  const selectedTypes = React.useMemo(() => params.types || [], [params.types]);
  const selectedTags = React.useMemo(() => params.tags || [], [params.tags]);
  const hiddenColumns = React.useMemo(
    () => normalizeHiddenColumns(params.hiddenColumns ?? []),
    [params.hiddenColumns],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => visibilityFromHidden(hiddenColumns));
  const pendingHiddenRef = React.useRef<string[] | null>(null);
  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(CLIENT_COLUMN_IDS);

  const persistColumnOrder = React.useCallback((order: string[]) => {
    if (typeof window === "undefined") {
      return;
    }
    const next = normalizeColumnOrder(
      order,
      CLIENT_COLUMN_IDS,
      PRIMARY_COLUMN_ID,
    );
    if (shallowEqualArrays(next, CLIENT_COLUMN_IDS)) {
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
        const next = normalizeColumnOrder(
          parsed,
          CLIENT_COLUMN_IDS,
          PRIMARY_COLUMN_ID,
        );
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
      const nextValue = sortingStateToValue(state) ?? CLIENTS_DEFAULT_SORT;
      setParams((prev) => ({ ...prev, sort: nextValue }));
    },
    [setParams],
  );

  const handlePageChange = React.useCallback(
    (newPage: number) => void setPage(newPage),
    [setPage],
  );

  const handlePageSizeChange = React.useCallback(
    (newPageSize: number) => {
      void setPageSize(newPageSize);
      void setPage(1);
    },
    [setPageSize, setPage],
  );

  const handleSearchChange = React.useCallback(
    (value: string) => {
      setParams((prev) => ({ ...prev, search: value }));
      void setPage(1);
    },
    [setParams, setPage],
  );

  const handleApplyAllFilters = React.useCallback(
    (types: string[], tags: string[]) => {
      setParams((prev) => ({
        ...prev,
        types,
        tags,
      }));
      void setPage(1);
    },
    [setParams, setPage],
  );

  const handleSortChange = React.useCallback(
    (value: string) => {
      setParams((prev) => ({ ...prev, sort: value }));
      void setPage(1);
    },
    [setParams, setPage],
  );

  const handleCreatedAtChange = React.useCallback(
    (start?: Date, end?: Date) => {
      void setCreatedAtStartStr(formatDateValue(start));
      void setCreatedAtEndStr(formatDateValue(end));
      void setPage(1);
    },
    [setCreatedAtStartStr, setCreatedAtEndStr, setPage],
  );

  const handleLastActivityChange = React.useCallback(
    (start?: Date, end?: Date) => {
      void setLastActivityStartStr(formatDateValue(start));
      void setLastActivityEndStr(formatDateValue(end));
      void setPage(1);
    },
    [setLastActivityStartStr, setLastActivityEndStr, setPage],
  );

  const handleUpdatedAtChange = React.useCallback(
    (start?: Date, end?: Date) => {
      void setUpdatedAtStartStr(formatDateValue(start));
      void setUpdatedAtEndStr(formatDateValue(end));
      void setPage(1);
    },
    [setUpdatedAtStartStr, setUpdatedAtEndStr, setPage],
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
        const next = normalizeColumnOrder(
          resolved,
          CLIENT_COLUMN_IDS,
          PRIMARY_COLUMN_ID,
        );
        persistColumnOrder(next);
        return next;
      });
    },
    [persistColumnOrder],
  );

  const selectedClients = React.useMemo(
    () => data.items.filter((client) => rowSelection[client.id]),
    [data.items, rowSelection],
  );
  const selectedExportRows = React.useMemo(
    () =>
      selectedClients.map((client) => ({
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        tags: client.tags ?? [],
        type: client.type,
        lastInteractionAt: client.lastInteractionAt,
      })),
    [selectedClients],
  );

  const deleteClients = useMutation(
    trpc.clients.delete.mutationOptions({
      onSuccess: async ({ deletedIds }) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.clients.list.queryKey(),
        });
        setRowSelection({});
        setDeleteTargets([]);
        toast.success(
          `${deletedIds.length} ${deletedIds.length === 1 ? "member" : "members"} deleted`,
        );
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const columns = React.useMemo(
    () =>
      createClientColumns({
        canManage,
        onDelete: (client) => setDeleteTargets([client]),
      }),
    [canManage],
  );

  const handleSegmentChange = React.useCallback(
    (nextSegment: ClientSegment) => {
      void setSegmentParam(nextSegment);
      void setPage(1);
      setRowSelection({});
    },
    [setPage, setSegmentParam],
  );

  const handleExportPdf = React.useCallback(() => {
    void exportClientsPdf(selectedExportRows).catch(() =>
      toast.error("PDF export failed"),
    );
  }, [selectedExportRows]);

  return (
    <>
      <div className="space-y-4 w-full">
        <ClientSegmentTabs value={segment} onChange={handleSegmentChange} />
        <DataTable
          data={data.items}
          columns={columns}
          isLoading={isFetching}
          getRowId={(row) => row.id}
          sorting={sortingState}
          onSortingChange={handleSortingChange}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={handleColumnVisibilityChange}
          columnOrder={columnOrder}
          onColumnOrderChange={handleColumnOrderChange}
          initialColumnOrder={CLIENT_COLUMN_IDS}
          initialSorting={[{ id: "updatedAt", desc: true }]}
          onRowClick={handleRowClick}
          enableGlobalSearch={false}
          enableRowSelection
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          pagination={{
            currentPage: data.pagination.currentPage,
            totalPages: data.pagination.totalPages,
            pageSize: data.pagination.pageSize,
            totalItems: data.pagination.totalItems,
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
          }}
          emptyState={
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary/80 dark:text-white/50 leading-4.5">
              No members have been added yet. <br /> Start by adding a member.
            </div>
          }
          toolbar={{
            filters: (ctx) => (
              <ClientsToolbar
                search={searchValue}
                onSearchChange={handleSearchChange}
                selectedTypes={selectedTypes}
                selectedTags={selectedTags}
                onApplyAllFilters={handleApplyAllFilters}
                sortValue={params.sort ?? CLIENTS_DEFAULT_SORT}
                onSortChange={handleSortChange}
                table={ctx.table}
                columnVisibility={columnVisibility}
                columnOrder={columnOrder}
                onColumnOrderChange={handleColumnOrderChange}
                initialColumnOrder={CLIENT_COLUMN_IDS}
                createdAtStart={createdAtStart || undefined}
                createdAtEnd={createdAtEnd || undefined}
                onCreatedAtChange={handleCreatedAtChange}
                lastActivityStart={lastActivityStart || undefined}
                lastActivityEnd={lastActivityEnd || undefined}
                onLastActivityChange={handleLastActivityChange}
                updatedAtStart={updatedAtStart || undefined}
                updatedAtEnd={updatedAtEnd || undefined}
                onUpdatedAtChange={handleUpdatedAtChange}
                scope={scope}
                selectedLocationId={selectedLocationId}
                onLocationChange={setSelectedLocationId}
              />
            ),
          }}
        />
      </div>

      <ClientsBulkToolbar
        canDelete={canManage}
        canExport={canExport}
        count={selectedClients.length}
        onClear={() => setRowSelection({})}
        onDelete={() => setDeleteTargets(selectedClients)}
        onExportCsv={() => exportClientsCsv(selectedExportRows)}
        onExportPdf={handleExportPdf}
      />
      <DeleteClientsDialog
        count={deleteTargets.length}
        names={deleteTargets.map((client) => client.name)}
        open={deleteTargets.length > 0}
        isPending={deleteClients.isPending}
        onOpenChange={(open) => {
          if (!open) setDeleteTargets([]);
        }}
        onConfirm={() =>
          deleteClients.mutate({
            ids: deleteTargets.map((client) => client.id),
          })
        }
      />
    </>
  );
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

function normalizeColumnOrder(
  order: string[],
  defaults: string[],
  fixedFirst?: string,
) {
  const seen = new Set<string>();
  const next: string[] = [];
  if (fixedFirst && defaults.includes(fixedFirst)) {
    seen.add(fixedFirst);
    next.push(fixedFirst);
  }
  for (const id of order) {
    if (!defaults.includes(id)) continue;
    if (fixedFirst && id === fixedFirst) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  for (const id of defaults) {
    if (fixedFirst && id === fixedFirst) continue;
    if (!seen.has(id)) {
      seen.add(id);
      next.push(id);
    }
  }
  return next;
}

function shallowEqualArrays(a: string[] | null, b: string[] | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function resolveUpdater<T>(updater: Updater<T>, previous: T): T {
  return typeof updater === "function"
    ? (updater as (input: T) => T)(previous)
    : updater;
}
