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
import { format, formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Pencil, Eye, Trash } from "lucide-react";
import * as React from "react";
import { useQueryState, parseAsString, parseAsInteger } from "nuqs";
import { DataTable } from "@/components/data-table/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { TagsDisplay } from "@/components/ui/tags-input";
import { UserStatusBadge } from "@/components/user-status-indicator";
import { CLIENTS_DEFAULT_SORT } from "@/features/crm/clients/constants";
import { useClientsParams } from "@/features/crm/clients/hooks/use-clients-params";
import { ClientType, UserStatus } from "@/db/enums";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { ClientEditSheet } from "./client-edit-sheet";
import { ClientsToolbar } from "./clients-toolbar";

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

const clientColumns: ColumnDef<ClientRow>[] = [
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
        LEAD: "text-amber-600 ring-amber-300 bg-amber-100 dark:border-amber-800",
        PROSPECT: "text-sky-600 ring-sky-300 bg-sky-100 dark:border-sky-800",
        CUSTOMER: "text-teal-600 ring-teal-300 bg-teal-100 dark:border-teal-800",
        CHURN: "text-rose-600 ring-rose-300 bg-rose-100 dark:border-rose-800",
      };
      return (
        <Badge
          variant="outline"
          className={cn(
            "text-[11px] w-fit capitalize",
            typeColors[row.original.type] ?? "text-gray-600 ring-gray-300 bg-gray-100 dark:border-gray-700",
          )}
        >
          {row.original.type.toLowerCase()}
        </Badge>
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
    id: "assignees",
    header: "Assigned to",
    meta: { label: "Assigned to" },
    cell: ({ row }) => <AssigneeCell client={row.original} />,
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Created at",
    meta: { label: "Created at" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-primary dark:text-white/60">
        {format(new Date(row.original.createdAt), "MMM d, yy")}'
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
            <DropdownMenuLabel className="text-xs text-primary/80 dark:text-white/50">
              Actions
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />
            <DropdownMenuItem
              className="text-xs dark:text-white text-primary hover:text-black hover:bg-primary-foreground cursor-pointer px-2"
              onClick={(e) => {
                e.stopPropagation();
                // View action will be handled by row click
                row.toggleSelected(true);
              }}
            >
              <Eye className="mr-0.5 size-3" />
              View details
            </DropdownMenuItem>

            <DropdownMenuItem
              className="text-xs dark:text-white text-primary hover:text-black hover:bg-primary-foreground cursor-pointer px-2"
              onClick={(e) => {
                e.stopPropagation();
                // Edit action - trigger the edit sheet
              }}
            >
              <Pencil className="mr-0.5 size-3" />
              Edit member
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs bg-rose-500 text-rose-100 hover:bg-rose-500/95 hover:text-white cursor-pointer px-2"
              onClick={(e) => {
                e.stopPropagation();
                // Delete action
              }}
            >
              <Trash className="mr-0.5 size-3" />
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

const PRIMARY_COLUMN_ID = "name";
const CLIENT_COLUMN_IDS = clientColumns.map(
  (column, index) => (column.id ?? `column-${index}`) as string,
);
const COLUMN_ORDER_STORAGE_KEY = "clients-table.column-order";

function AssigneeCell({ client }: { client: ClientRow }) {
  const assignees = client.assignees;

  if (assignees.length === 0) {
    return (
      <span className="text-xs text-primary/80 dark:text-white/40">
        Unassigned
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex",
        assignees.length === 1 ? "items-center gap-3" : "-space-x-2",
      )}
    >
      {assignees.slice(0, 3).map((assignee) => {
        const activityTitle = assignee.isOnline
          ? `${assignee.name} (Online)`
          : assignee.lastActivityAt
            ? `${assignee.name} (Last seen ${formatDistanceToNow(
                new Date(assignee.lastActivityAt),
                { addSuffix: true },
              )})`
            : (assignee.name ?? "Unknown");

        return (
          <div key={assignee.id} className="relative">
            <Avatar className="size-8" title={activityTitle}>
              {assignee.image ? (
                <AvatarImage src={assignee.image} alt={assignee.name ?? ""} />
              ) : (
                <AvatarFallback className="bg-muted text-muted-foreground text-[11px]">
                  {(assignee.name?.[0] ?? "U").toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="absolute bottom-0 right-0 ring-2 ring-background">
              <UserStatusBadge
                status={(assignee.status as UserStatus) || UserStatus.OFFLINE}
              />
            </span>
          </div>
        );
      })}

      {assignees.length === 1 && (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium text-primary dark:text-white">
              {assignees[0].name}
            </p>
            {assignees[0].isOnline && (
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                Online
              </span>
            )}
          </div>
          <p className="text-[11px] text-primary/50 dark:text-white/50">
            {assignees[0].lastActivityAt
              ? `Active ${formatDistanceToNow(
                  new Date(assignees[0].lastActivityAt),
                  { addSuffix: true },
                )}`
              : (assignees[0].email ?? "—")}
          </p>
        </div>
      )}

      {assignees.length > 3 ? (
        <Avatar className="size-7 border border-[#1a2326] bg-[#1f2a2f] text-[11px]">
          <AvatarFallback>+{assignees.length - 3}</AvatarFallback>
        </Avatar>
      ) : null}
    </div>
  );
}

type ClientsTableProps = {
  scope?: "agency" | "all-clients";
  clientView?: "members" | "leads" | "all";
};

export function ClientsTable({
  scope = "agency",
  clientView = "all",
}: ClientsTableProps) {
  const trpc = useTRPC();
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

  // Convert strings to Date objects for use in components
  const createdAtStart = createdAtStartStr
    ? new Date(createdAtStartStr)
    : undefined;
  const createdAtEnd = createdAtEndStr ? new Date(createdAtEndStr) : undefined;
  const lastActivityStart = lastActivityStartStr
    ? new Date(lastActivityStartStr)
    : undefined;
  const lastActivityEnd = lastActivityEndStr
    ? new Date(lastActivityEndStr)
    : undefined;
  const updatedAtStart = updatedAtStartStr
    ? new Date(updatedAtStartStr)
    : undefined;
  const updatedAtEnd = updatedAtEndStr ? new Date(updatedAtEndStr) : undefined;

  const [selectedClient, setSelectedClient] =
    React.useState<ClientRow | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = React.useState(false);

  const { data, isFetching } = useSuspenseQuery(
    trpc.clients.list.queryOptions({
      page,
      pageSize,
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
      assignedTo: params.assignedTo.length > 0 ? params.assignedTo : undefined,
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

  const [rowSelection, setRowSelection] = React.useState({});

  const handleRowClick = React.useCallback((client: ClientRow) => {
    setSelectedClient(client);
    setIsEditSheetOpen(true);
  }, []);

  const sortingState = React.useMemo(
    () => sortValueToState(params.sort),
    [params.sort],
  );
  const searchValue = params.search ?? "";
  const selectedTypes = React.useMemo(() => params.types || [], [params.types]);
  const selectedTags = React.useMemo(() => params.tags || [], [params.tags]);
  const selectedAssignees = React.useMemo(
    () => params.assignedTo || [],
    [params.assignedTo],
  );
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

  const handleApplyTypes = React.useCallback(
    (types: string[]) => {
      setParams((prev) => ({
        ...prev,
        types,
      }));
      void setPage(1);
    },
    [setParams, setPage],
  );

  const handleApplyTags = React.useCallback(
    (tags: string[]) => {
      setParams((prev) => ({
        ...prev,
        tags,
      }));
      void setPage(1);
    },
    [setParams, setPage],
  );

  const handleApplyAssignees = React.useCallback(
    (assignees: string[]) => {
      setParams((prev) => ({
        ...prev,
        assignedTo: assignees,
      }));
      void setPage(1);
    },
    [setParams, setPage],
  );

  const handleApplyAllFilters = React.useCallback(
    (types: string[], tags: string[], assignees: string[]) => {
      setParams((prev) => ({
        ...prev,
        types,
        tags,
        assignedTo: assignees,
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
      const toYMD = (d: Date) => d.toISOString().slice(0, 10);
      void setCreatedAtStartStr(start ? toYMD(start) : "");
      void setCreatedAtEndStr(end ? toYMD(end) : "");
      void setPage(1);
    },
    [setCreatedAtStartStr, setCreatedAtEndStr, setPage],
  );

  const handleLastActivityChange = React.useCallback(
    (start?: Date, end?: Date) => {
      const toYMD = (d: Date) => d.toISOString().slice(0, 10);
      void setLastActivityStartStr(start ? toYMD(start) : "");
      void setLastActivityEndStr(end ? toYMD(end) : "");
      void setPage(1);
    },
    [setLastActivityStartStr, setLastActivityEndStr, setPage],
  );

  const handleUpdatedAtChange = React.useCallback(
    (start?: Date, end?: Date) => {
      const toYMD = (d: Date) => d.toISOString().slice(0, 10);
      void setUpdatedAtStartStr(start ? toYMD(start) : "");
      void setUpdatedAtEndStr(end ? toYMD(end) : "");
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

  return (
    <>
      <div className="space-y-4 w-full">
        <DataTable
          data={data.items}
          columns={clientColumns}
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
                onApplyTypes={handleApplyTypes}
                selectedTags={selectedTags}
                onApplyTags={handleApplyTags}
                selectedAssignees={selectedAssignees}
                onApplyAssignees={handleApplyAssignees}
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

      {selectedClient && (
      <ClientEditSheet
        open={isEditSheetOpen}
        onOpenChange={setIsEditSheetOpen}
        client={{
          ...selectedClient,
          tags: selectedClient.tags ?? [],
          fitnessGoals: selectedClient.fitnessGoals ?? [],
        }}
        clientView={clientView}
      />
      )}
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
