"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnOrderState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { formatDistanceToNow } from "date-fns";
import { Mail, MoreHorizontal, Shield, UserX } from "lucide-react";
import * as React from "react";
import { parseAsInteger } from "nuqs";
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
import { UserStatusBadge } from "@/components/user-status-indicator";
import {
  MEMBERS_DEFAULT_SORT,
  ROLE_COLORS,
} from "@/features/organizations/members/constants";
import { useMembersParams } from "@/features/organizations/members/hooks/use-members-params";
import { UserStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { MembersToolbar } from "./members-toolbar";

type RouterOutput = inferRouterOutputs<AppRouter>;
type MemberRow = RouterOutput["organizations"]["listMembers"]["items"][number];

const SORTABLE_COLUMNS = new Set(["name", "email", "role", "createdAt"]);

const sortValueToState = (value?: string): SortingState => {
  const sort = value || MEMBERS_DEFAULT_SORT;
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

const getRoleBadgeColor = (role: string | null | undefined) => {
  if (!role) return ROLE_COLORS.viewer;
  return (ROLE_COLORS as any)[role] || ROLE_COLORS.viewer;
};

const getRoleLabel = (role: string | null | undefined) => {
  if (!role) return "Viewer";

  // Agency roles (lowercase)
  const agencyRoleMap: Record<string, string> = {
    owner: "Agency Owner",
    admin: "Agency Admin",
    manager: "Agency Manager",
    staff: "Agency Staff",
    viewer: "Agency Viewer",
  };

  // Subaccount roles (UPPERCASE)
  const subaccountRoleMap: Record<string, string> = {
    AGENCY: "Agency Team",
    ADMIN: "Subaccount Admin",
    MANAGER: "Manager",
    STANDARD: "Standard User",
    LIMITED: "Limited User",
    VIEWER: "Viewer",
  };

  return agencyRoleMap[role] || subaccountRoleMap[role] || role;
};

const memberColumns: ColumnDef<MemberRow>[] = [
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
      const member = row.original;
      const initials = (member.name || "U")
        .split(" ")
        .map((part: string) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      return (
        <div className="flex items-center gap-3 max-w-[200px]">
          <div className="relative">
            <Avatar className="size-8">
              {member.image ? (
                <AvatarImage
                  src={member.image}
                  alt={member.name || "User"}
                  className="object-cover"
                />
              ) : (
                <AvatarFallback className="bg-[#202e32] brightness-120 text-xs text-white">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>

            <span className="absolute top-[calc(100%-8px)] left-[calc(100%-6px)]">
              <UserStatusBadge
                status={(member.status as UserStatus) || UserStatus.OFFLINE}
              />
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-primary dark:text-white truncate">
                {member.name || "Unknown"}
              </p>
              {member.isOnline && (
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                  Online
                </span>
              )}
            </div>
            <p className="text-[11px] text-primary/60 dark:text-white/50 truncate">
              {member.email ?? "—"}
            </p>
          </div>
        </div>
      );
    },
  },
  {
    id: "email",
    accessorKey: "email",
    header: "Email",
    meta: { label: "Email" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-primary dark:text-white/80">
        {row.original.email || "—"}
      </span>
    ),
  },
  {
    id: "role",
    accessorKey: "role",
    header: "Role",
    meta: { label: "Role" },
    enableSorting: true,
    cell: ({ row }) => {
      const role = row.original.role;
      return (
        <Badge
          className={cn(
            "text-[10px] border whitespace-nowrap",
            getRoleBadgeColor(role)
          )}
        >
          {getRoleLabel(role)}
        </Badge>
      );
    },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => {
      const member = row.original;
      const statusText =
        member.status?.toString().replace(/_/g, " ").toLowerCase() ?? "offline";
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-primary dark:text-white/80 capitalize">
            {statusText}
          </span>
          {member.statusMessage && (
            <span className="text-[10px] text-primary/60 dark:text-white/50 line-clamp-1">
              {member.statusMessage}
            </span>
          )}
        </div>
      );
    },
  },
  {
    id: "lastActivity",
    accessorKey: "lastActivityAt",
    header: "Last activity",
    meta: { label: "Last activity" },
    cell: ({ row }) => (
      <span className="text-xs text-primary/80 dark:text-white/60">
        {row.original.lastActivityAt
          ? formatDistanceToNow(new Date(row.original.lastActivityAt), {
              addSuffix: true,
            })
          : "Never"}
      </span>
    ),
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Joined",
    meta: { label: "Joined" },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-primary dark:text-white/60">
        {formatDistanceToNow(new Date(row.original.createdAt), {
          addSuffix: true,
        })}
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
                window.location.href = `mailto:${row.original.email}`;
              }}
            >
              <Mail className="mr-1 size-3.5" />
              Send email
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs dark:text-white text-primary hover:text-black hover:bg-primary-foreground cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                // Change role action
              }}
            >
              <Shield className="mr-1 size-3.5" />
              Change role
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                // Remove member action
              }}
            >
              <UserX className="mr-1 size-3.5" />
              Remove member
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
const MEMBER_COLUMN_IDS = memberColumns.map(
  (column, index) => (column.id ?? `column-${index}`) as string
);
const COLUMN_ORDER_STORAGE_KEY = "members-table.column-order";

export function MembersTable() {
  const trpc = useTRPC();
  const [params, setParams] = useMembersParams();

  const { data, isFetching } = useSuspenseQuery(
    trpc.organizations.listMembers.queryOptions({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search || undefined,
      roles: params.roles.length > 0 ? (params.roles as any) : undefined,
      status: params.status.length > 0 ? (params.status as any) : undefined,
      sort: params.sort || undefined,
    })
  );

  const [rowSelection, setRowSelection] = React.useState({});

  const sortingState = React.useMemo(
    () => sortValueToState(params.sort),
    [params.sort]
  );
  const searchValue = params.search ?? "";
  const selectedRoles = React.useMemo(() => params.roles || [], [params.roles]);
  const selectedStatus = React.useMemo(
    () => params.status || [],
    [params.status]
  );
  const hiddenColumns = React.useMemo(
    () => normalizeHiddenColumns(params.hiddenColumns ?? []),
    [params.hiddenColumns]
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => visibilityFromHidden(hiddenColumns));
  const pendingHiddenRef = React.useRef<string[] | null>(null);
  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(MEMBER_COLUMN_IDS);

  const persistColumnOrder = React.useCallback((order: string[]) => {
    if (typeof window === "undefined") {
      return;
    }
    const next = normalizeColumnOrder(
      order,
      MEMBER_COLUMN_IDS,
      PRIMARY_COLUMN_ID
    );
    if (shallowEqualArrays(next, MEMBER_COLUMN_IDS)) {
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
          MEMBER_COLUMN_IDS,
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
      const nextValue = sortingStateToValue(state) ?? MEMBERS_DEFAULT_SORT;
      setParams((prev) => ({ ...prev, sort: nextValue }));
    },
    [setParams]
  );

  const handleSearchChange = React.useCallback(
    (value: string) => {
      setParams((prev) => ({ ...prev, search: value, page: 1 }));
    },
    [setParams]
  );

  const handleSortChange = React.useCallback(
    (value: string) => {
      setParams((prev) => ({ ...prev, sort: value }));
    },
    [setParams]
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
    (order: ColumnOrderState) => {
      setColumnOrder(order);
      persistColumnOrder(order);
    },
    [persistColumnOrder]
  );

  const handleApplyAllFilters = React.useCallback(
    (filters: { roles: string[]; status: string[] }) => {
      setParams((prev) => ({
        ...prev,
        page: 1, // Reset to page 1 on filter change
        roles: filters.roles,
        status: filters.status,
      }));
    },
    [setParams]
  );

  const handlePageChange = React.useCallback(
    (newPage: number) => {
      setParams((prev) => ({ ...prev, page: newPage }));
    },
    [setParams]
  );

  const handlePageSizeChange = React.useCallback(
    (newPageSize: number) => {
      setParams((prev) => ({ ...prev, pageSize: newPageSize, page: 1 }));
    },
    [setParams]
  );

  return (
    <div className="space-y-4 w-full">
      <DataTable
        data={data.items}
        columns={memberColumns}
        isLoading={isFetching}
        getRowId={(row) => row.id}
        sorting={sortingState}
        onSortingChange={handleSortingChange}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        columnOrder={columnOrder}
        onColumnOrderChange={handleColumnOrderChange}
        initialColumnOrder={MEMBER_COLUMN_IDS}
        initialSorting={[{ id: "name", desc: false }]}
        enableGlobalSearch={false}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        emptyState={
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary/80 dark:text-white/50 leading-4.5">
            No members found. <br /> Start by inviting team members.
          </div>
        }
        toolbar={{
          filters: (ctx) => (
            <MembersToolbar
              search={searchValue}
              onSearchChange={handleSearchChange}
              selectedRoles={selectedRoles}
              selectedStatus={selectedStatus}
              sortValue={params.sort ?? MEMBERS_DEFAULT_SORT}
              onSortChange={handleSortChange}
              table={ctx.table}
              columnVisibility={columnVisibility}
              columnOrder={columnOrder}
              onColumnOrderChange={handleColumnOrderChange}
              initialColumnOrder={MEMBER_COLUMN_IDS}
              onApplyAllFilters={handleApplyAllFilters}
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
