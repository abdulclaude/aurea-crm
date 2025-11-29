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
import { useQueryState, parseAsString } from "nuqs";
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
import { CONTACTS_DEFAULT_SORT } from "@/features/crm/contacts/constants";
import { useContactsParams } from "@/features/crm/contacts/hooks/use-contacts-params";
import { type ContactType, UserStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { ContactEditSheet } from "./contact-edit-sheet";
import { ContactsToolbar } from "./contacts-toolbar";

type RouterOutput = inferRouterOutputs<AppRouter>;
type ContactRow = RouterOutput["contacts"]["list"]["items"][number];

const SORTABLE_COLUMNS = new Set([
  "name",
  "companyName",
  "createdAt",
  "updatedAt",
]);

const sortValueToState = (value?: string): SortingState => {
  const sort = value || CONTACTS_DEFAULT_SORT;
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

const contactColumns: ColumnDef<ContactRow>[] = [
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
    header: "Contact name",
    meta: { label: "Contact" },
    enableHiding: false,
    enableSorting: true,
    cell: ({ row }) => {
      const contact = row.original;
      const initials = contact.name
        .split(" ")
        .map((part: string) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      return (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            {contact.logo ? (
              <AvatarImage
                src={contact.logo}
                alt={contact.name}
                className="object-cover"
              />
            ) : (
              <AvatarFallback className="bg-[#202e32] brightness-120 text-[11px] text-white">
                {initials}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs font-medium text-primary dark:text-white">
              {contact.name}
            </p>
            <p className="text-[11px] text-primary/60 dark:text-white/50">
              {contact.email ?? "—"}
            </p>
          </div>
        </div>
      );
    },
  },
  {
    id: "companyName",
    accessorKey: "companyName",
    header: "Company name",
    meta: { label: "Company name" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-primary dark:text-white/80 capitalize">
        {row.original.companyName ?? "—"}
      </span>
    ),
  },
  {
    id: "type",
    accessorKey: "type",
    header: "Type",
    meta: { label: "Type" },
    cell: ({ row }) => (
      <Badge
        className={cn(
          "text-[10px] capitalize",
          row.original.type === "LEAD" && "bg-amber-600 text-white",
          row.original.type === "PROSPECT" && "bg-sky-600 text-sky-100",
          row.original.type === "CUSTOMER" && "bg-teal-600 text-teal-100",
          row.original.type === "CHURN" && "bg-rose-600 text-rose-100"
        )}
      >
        {row.original.type.toLowerCase()}
      </Badge>
    ),
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
    cell: ({ row }) => <AssigneeCell contact={row.original} />,
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
              Edit contact
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs bg-rose-500 text-rose-100 hover:bg-rose-500/95 hover:text-white cursor-pointer px-2"
              onClick={(e) => {
                e.stopPropagation();
                // Delete action
              }}
            >
              <Trash className="mr-0.5 size-3" />
              Delete contact
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
const CONTACT_COLUMN_IDS = contactColumns.map(
  (column, index) => (column.id ?? `column-${index}`) as string
);
const COLUMN_ORDER_STORAGE_KEY = "contacts-table.column-order";

function AssigneeCell({ contact }: { contact: ContactRow }) {
  const assignees = contact.assignees;

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
        assignees.length === 1 ? "items-center gap-3" : "-space-x-2"
      )}
    >
      {assignees.slice(0, 3).map((assignee) => {
        const activityTitle = assignee.isOnline
          ? `${assignee.name} (Online)`
          : assignee.lastActivityAt
          ? `${assignee.name} (Last seen ${formatDistanceToNow(
              new Date(assignee.lastActivityAt),
              { addSuffix: true }
            )})`
          : assignee.name ?? "Unknown";

        return (
          <div key={assignee.id} className="relative">
            <Avatar className="size-8" title={activityTitle}>
              {assignee.image ? (
                <AvatarImage src={assignee.image} alt={assignee.name ?? ""} />
              ) : (
                <AvatarFallback className="bg-[#202e32] brightness-120 text-[11px] text-white">
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
                  { addSuffix: true }
                )}`
              : assignees[0].email ?? "—"}
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

export function ContactsTable() {
  const trpc = useTRPC();
  const [params, setParams] = useContactsParams();

  // Separate query state hooks for date parameters (using parseAsString like profitableedge)
  const [createdAtStartStr, setCreatedAtStartStr] = useQueryState(
    "createdAtStart",
    parseAsString.withDefault("")
  );
  const [createdAtEndStr, setCreatedAtEndStr] = useQueryState(
    "createdAtEnd",
    parseAsString.withDefault("")
  );
  const [lastActivityStartStr, setLastActivityStartStr] = useQueryState(
    "lastActivityStart",
    parseAsString.withDefault("")
  );
  const [lastActivityEndStr, setLastActivityEndStr] = useQueryState(
    "lastActivityEnd",
    parseAsString.withDefault("")
  );
  const [updatedAtStartStr, setUpdatedAtStartStr] = useQueryState(
    "updatedAtStart",
    parseAsString.withDefault("")
  );
  const [updatedAtEndStr, setUpdatedAtEndStr] = useQueryState(
    "updatedAtEnd",
    parseAsString.withDefault("")
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

  const [selectedContact, setSelectedContact] =
    React.useState<ContactRow | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = React.useState(false);

  const { data, isFetching } = useSuspenseQuery(
    trpc.contacts.list.queryOptions({
      search: params.search || undefined,
      types: params.types as ContactType[] | undefined,
      tags: params.tags.length > 0 ? params.tags : undefined,
      assignedTo: params.assignedTo.length > 0 ? params.assignedTo : undefined,
      createdAtStart: createdAtStart || undefined,
      createdAtEnd: createdAtEnd || undefined,
      lastActivityStart: lastActivityStart || undefined,
      lastActivityEnd: lastActivityEnd || undefined,
      updatedAtStart: updatedAtStart || undefined,
      updatedAtEnd: updatedAtEnd || undefined,
    })
  );

  const [rowSelection, setRowSelection] = React.useState({});

  const handleRowClick = React.useCallback((contact: ContactRow) => {
    setSelectedContact(contact);
    setIsEditSheetOpen(true);
  }, []);

  const sortingState = React.useMemo(
    () => sortValueToState(params.sort),
    [params.sort]
  );
  const searchValue = params.search ?? "";
  const selectedTypes = React.useMemo(() => params.types || [], [params.types]);
  const selectedTags = React.useMemo(() => params.tags || [], [params.tags]);
  const selectedAssignees = React.useMemo(
    () => params.assignedTo || [],
    [params.assignedTo]
  );
  const hiddenColumns = React.useMemo(
    () => normalizeHiddenColumns(params.hiddenColumns ?? []),
    [params.hiddenColumns]
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => visibilityFromHidden(hiddenColumns));
  const pendingHiddenRef = React.useRef<string[] | null>(null);
  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(CONTACT_COLUMN_IDS);

  const persistColumnOrder = React.useCallback((order: string[]) => {
    if (typeof window === "undefined") {
      return;
    }
    const next = normalizeColumnOrder(
      order,
      CONTACT_COLUMN_IDS,
      PRIMARY_COLUMN_ID
    );
    if (shallowEqualArrays(next, CONTACT_COLUMN_IDS)) {
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
          CONTACT_COLUMN_IDS,
          PRIMARY_COLUMN_ID
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
      const nextValue = sortingStateToValue(state) ?? CONTACTS_DEFAULT_SORT;
      setParams((prev) => ({ ...prev, sort: nextValue }));
    },
    [setParams]
  );

  const handleSearchChange = React.useCallback(
    (value: string) => {
      setParams((prev) => ({ ...prev, search: value }));
    },
    [setParams]
  );

  const handleApplyTypes = React.useCallback(
    (types: string[]) => {
      setParams((prev) => ({
        ...prev,
        types,
      }));
    },
    [setParams]
  );

  const handleApplyTags = React.useCallback(
    (tags: string[]) => {
      setParams((prev) => ({
        ...prev,
        tags,
      }));
    },
    [setParams]
  );

  const handleApplyAssignees = React.useCallback(
    (assignees: string[]) => {
      setParams((prev) => ({
        ...prev,
        assignedTo: assignees,
      }));
    },
    [setParams]
  );

  const handleApplyAllFilters = React.useCallback(
    (types: string[], tags: string[], assignees: string[]) => {
      setParams((prev) => ({
        ...prev,
        types,
        tags,
        assignedTo: assignees,
      }));
    },
    [setParams]
  );

  const handleSortChange = React.useCallback(
    (value: string) => {
      setParams((prev) => ({ ...prev, sort: value }));
    },
    [setParams]
  );

  const handleCreatedAtChange = React.useCallback(
    (start?: Date, end?: Date) => {
      const toYMD = (d: Date) => d.toISOString().slice(0, 10);
      void setCreatedAtStartStr(start ? toYMD(start) : "");
      void setCreatedAtEndStr(end ? toYMD(end) : "");
    },
    [setCreatedAtStartStr, setCreatedAtEndStr]
  );

  const handleLastActivityChange = React.useCallback(
    (start?: Date, end?: Date) => {
      const toYMD = (d: Date) => d.toISOString().slice(0, 10);
      void setLastActivityStartStr(start ? toYMD(start) : "");
      void setLastActivityEndStr(end ? toYMD(end) : "");
    },
    [setLastActivityStartStr, setLastActivityEndStr]
  );

  const handleUpdatedAtChange = React.useCallback(
    (start?: Date, end?: Date) => {
      const toYMD = (d: Date) => d.toISOString().slice(0, 10);
      void setUpdatedAtStartStr(start ? toYMD(start) : "");
      void setUpdatedAtEndStr(end ? toYMD(end) : "");
    },
    [setUpdatedAtStartStr, setUpdatedAtEndStr]
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
    [setParams]
  );

  const handleColumnOrderChange = React.useCallback(
    (updater: Updater<ColumnOrderState>) => {
      setColumnOrder((previous) => {
        const resolved = resolveUpdater(updater, previous);
        const next = normalizeColumnOrder(
          resolved,
          CONTACT_COLUMN_IDS,
          PRIMARY_COLUMN_ID
        );
        persistColumnOrder(next);
        return next;
      });
    },
    [persistColumnOrder]
  );

  return (
    <>
      <div className="space-y-4 w-full pt-6">
        <DataTable
          data={data.items}
          columns={contactColumns}
          isLoading={isFetching}
          getRowId={(row) => row.id}
          sorting={sortingState}
          onSortingChange={handleSortingChange}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={handleColumnVisibilityChange}
          columnOrder={columnOrder}
          onColumnOrderChange={handleColumnOrderChange}
          initialColumnOrder={CONTACT_COLUMN_IDS}
          initialSorting={[{ id: "updatedAt", desc: true }]}
          onRowClick={handleRowClick}
          enableGlobalSearch={false}
          enableRowSelection
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          emptyState={
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary/80 dark:text-white/50 leading-4.5">
              No contacts have been added yet. <br /> Start by adding a contact.
            </div>
          }
          toolbar={{
            filters: (ctx) => (
              <ContactsToolbar
                search={searchValue}
                onSearchChange={handleSearchChange}
                selectedTypes={selectedTypes}
                onApplyTypes={handleApplyTypes}
                selectedTags={selectedTags}
                onApplyTags={handleApplyTags}
                selectedAssignees={selectedAssignees}
                onApplyAssignees={handleApplyAssignees}
                onApplyAllFilters={handleApplyAllFilters}
                sortValue={params.sort ?? CONTACTS_DEFAULT_SORT}
                onSortChange={handleSortChange}
                table={ctx.table}
                columnVisibility={columnVisibility}
                columnOrder={columnOrder}
                onColumnOrderChange={handleColumnOrderChange}
                initialColumnOrder={CONTACT_COLUMN_IDS}
                createdAtStart={createdAtStart || undefined}
                createdAtEnd={createdAtEnd || undefined}
                onCreatedAtChange={handleCreatedAtChange}
                lastActivityStart={lastActivityStart || undefined}
                lastActivityEnd={lastActivityEnd || undefined}
                onLastActivityChange={handleLastActivityChange}
                updatedAtStart={updatedAtStart || undefined}
                updatedAtEnd={updatedAtEnd || undefined}
                onUpdatedAtChange={handleUpdatedAtChange}
              />
            ),
          }}
        />
      </div>

      {selectedContact && (
        <ContactEditSheet
          open={isEditSheetOpen}
          onOpenChange={setIsEditSheetOpen}
          contact={selectedContact}
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
  fixedFirst?: string
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
