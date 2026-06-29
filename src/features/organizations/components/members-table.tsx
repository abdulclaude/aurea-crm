"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { UserStatusBadge } from "@/components/user-status-indicator";
import {
  AGENCY_ROLES,
  MEMBERS_DEFAULT_SORT,
  LOCATION_ROLES,
} from "@/features/organizations/members/constants";
import { useMembersParams } from "@/features/organizations/members/hooks/use-members-params";
import { UserStatus, type UserStatus as UserStatusValue } from "@/db/enums";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { MembersToolbar } from "./members-toolbar";
import { toast } from "sonner";

type RouterOutput = inferRouterOutputs<AppRouter>;
type MemberRow = RouterOutput["organizations"]["listMembers"]["items"][number];
type MemberRoleFilter =
  | "owner"
  | "admin"
  | "manager"
  | "staff"
  | "viewer"
  | "AGENCY"
  | "ADMIN"
  | "MANAGER"
  | "STANDARD"
  | "LIMITED"
  | "VIEWER";

const MEMBER_ROLE_VALUES: readonly MemberRoleFilter[] = [
  "owner",
  "admin",
  "manager",
  "staff",
  "viewer",
  "AGENCY",
  "ADMIN",
  "MANAGER",
  "STANDARD",
  "LIMITED",
  "VIEWER",
];

const USER_STATUS_VALUES = Object.values(UserStatus) as UserStatusValue[];

function isMemberRoleFilter(value: string): value is MemberRoleFilter {
  return MEMBER_ROLE_VALUES.includes(value as MemberRoleFilter);
}

function isUserStatusValue(value: string): value is UserStatusValue {
  return USER_STATUS_VALUES.includes(value as UserStatusValue);
}

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

const getRoleBadgeColor = (role: string | null | undefined): string => {
  if (!role)
    return "text-gray-500 ring-gray-200 bg-gray-100 dark:border-gray-700";
  const colors: Record<string, string> = {
    owner:
      "text-indigo-600 ring-indigo-300 bg-indigo-100 dark:border-indigo-800",
    admin: "text-blue-600 ring-blue-300 bg-blue-100 dark:border-blue-800",
    manager: "text-cyan-600 ring-cyan-300 bg-cyan-100 dark:border-cyan-800",
    staff:
      "text-emerald-600 ring-emerald-300 bg-emerald-100 dark:border-emerald-800",
    viewer: "text-gray-500 ring-gray-200 bg-gray-100 dark:border-gray-700",
    AGENCY:
      "text-indigo-600 ring-indigo-300 bg-indigo-100 dark:border-indigo-800",
    ADMIN:
      "text-orange-600 ring-orange-300 bg-orange-100 dark:border-orange-800",
    MANAGER: "text-teal-600 ring-teal-300 bg-teal-100 dark:border-teal-800",
    STANDARD:
      "text-emerald-600 ring-emerald-300 bg-emerald-100 dark:border-emerald-800",
    LIMITED: "text-amber-600 ring-amber-200 bg-amber-100 dark:border-amber-800",
    VIEWER: "text-gray-500 ring-gray-200 bg-gray-100 dark:border-gray-700",
  };
  return colors[role] || colors.viewer;
};

const getRoleLabel = (role: string | null | undefined) => {
  if (!role) return "Viewer";

  const roleMap: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    manager: "Manager",
    staff: "Staff",
    viewer: "Viewer",
    AGENCY: "Studio team",
    ADMIN: "Admin",
    MANAGER: "Manager",
    STANDARD: "Instructor",
    LIMITED: "Front desk",
    VIEWER: "Viewer",
  };

  return roleMap[role] || role;
};

const PRIMARY_COLUMN_ID = "name";
const COLUMN_ORDER_STORAGE_KEY = "members-table.column-order";

export function MembersTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [params, setParams] = useMembersParams();
  const [roleDialogOpen, setRoleDialogOpen] = React.useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = React.useState(false);
  const [activeMember, setActiveMember] = React.useState<MemberRow | null>(
    null,
  );
  const [selectedRole, setSelectedRole] = React.useState<string>("");

  const listMembersInput = React.useMemo(
    () => ({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search || undefined,
      roles:
        params.roles.length > 0
          ? params.roles.filter(isMemberRoleFilter)
          : undefined,
      status:
        params.status.length > 0
          ? params.status.filter(isUserStatusValue)
          : undefined,
      sort: params.sort || undefined,
    }),
    [
      params.page,
      params.pageSize,
      params.search,
      params.roles,
      params.status,
      params.sort,
    ],
  );

  const { data, isFetching } = useSuspenseQuery(
    trpc.organizations.listMembers.queryOptions(listMembersInput),
  );

  const updateMemberRole = useMutation(
    trpc.organizations.updateMemberRole.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.organizations.listMembers.queryOptions(listMembersInput),
        );
        toast.success("Member role updated");
      },
    }),
  );

  const removeMember = useMutation(
    trpc.organizations.removeMember.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.organizations.listMembers.queryOptions(listMembersInput),
        );
        toast.success("Member removed");
      },
    }),
  );

  const [rowSelection, setRowSelection] = React.useState({});

  const sortingState = React.useMemo(
    () => sortValueToState(params.sort),
    [params.sort],
  );
  const searchValue = params.search ?? "";
  const selectedRoles = React.useMemo(() => params.roles || [], [params.roles]);
  const selectedStatus = React.useMemo(
    () => params.status || [],
    [params.status],
  );
  const hiddenColumns = React.useMemo(
    () => normalizeHiddenColumns(params.hiddenColumns ?? []),
    [params.hiddenColumns],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => visibilityFromHidden(hiddenColumns));
  const pendingHiddenRef = React.useRef<string[] | null>(null);

  const handleChangeRoleClick = React.useCallback((member: MemberRow) => {
    const fallbackRole =
      member.memberType === "organization" ? "viewer" : "STANDARD";
    setActiveMember(member);
    setSelectedRole(member.role || fallbackRole);
    setRoleDialogOpen(true);
  }, []);

  const handleRemoveMemberClick = React.useCallback((member: MemberRow) => {
    setActiveMember(member);
    setRemoveDialogOpen(true);
  }, []);

  const memberColumns = React.useMemo<ColumnDef<MemberRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
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
                <Avatar className="size-10">
                  {member.image ? (
                    <AvatarImage
                      src={member.image}
                      alt={member.name || "User"}
                      className="object-cover"
                    />
                  ) : (
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
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
              <div className="min-w-0 space-y-1">
                <div>
                  <p className="text-xs font-medium text-primary dark:text-white truncate">
                    {member.name || "Unknown"}
                  </p>
                </div>

                {member.isOnline && (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                    Online
                  </span>
                )}
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
              variant="outline"
              className={cn("text-[11px] w-fit", getRoleBadgeColor(role))}
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
          const status = member.status?.toString() ?? "OFFLINE";
          const statusConfig: Record<
            string,
            { label: string; className: string }
          > = {
            ONLINE: {
              label: "Online",
              className:
                "text-emerald-600 ring-emerald-300 bg-emerald-100 dark:border-emerald-800",
            },
            WORKING: {
              label: "Working",
              className:
                "text-blue-600 ring-blue-300 bg-blue-100 dark:border-blue-800",
            },
            DO_NOT_DISTURB: {
              label: "Do Not Disturb",
              className:
                "text-rose-600 ring-rose-300 bg-rose-100 dark:border-rose-800",
            },
            AWAY: {
              label: "Away",
              className:
                "text-amber-600 ring-amber-200 bg-amber-100 dark:border-amber-800",
            },
            OFFLINE: {
              label: "Offline",
              className:
                "text-gray-500 ring-gray-200 bg-gray-100 dark:border-gray-700",
            },
          };
          const config = statusConfig[status] ?? statusConfig.OFFLINE;
          return (
            <div className="flex flex-col gap-1">
              <Badge
                variant="outline"
                className={cn("text-[11px] w-fit", config.className)}
              >
                {config.label}
              </Badge>
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
                    handleChangeRoleClick(row.original);
                  }}
                >
                  <Shield className="mr-1 size-3.5" />
                  Change role
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-xs text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveMemberClick(row.original);
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
    ],
    [handleChangeRoleClick, handleRemoveMemberClick],
  );

  const memberColumnIds = React.useMemo(
    () =>
      memberColumns.map(
        (column, index) => (column.id ?? `column-${index}`) as string,
      ),
    [memberColumns],
  );

  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(memberColumnIds);

  const persistColumnOrder = React.useCallback((order: string[]) => {
    if (typeof window === "undefined") {
      return;
    }
    const next = normalizeColumnOrder(
      order,
      memberColumnIds,
      PRIMARY_COLUMN_ID,
    );
    if (shallowEqualArrays(next, memberColumnIds)) {
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
          memberColumnIds,
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
      const nextValue = sortingStateToValue(state) ?? MEMBERS_DEFAULT_SORT;
      setParams((prev) => ({ ...prev, sort: nextValue }));
    },
    [setParams],
  );

  const handleSearchChange = React.useCallback(
    (value: string) => {
      setParams((prev) => ({ ...prev, search: value, page: 1 }));
    },
    [setParams],
  );

  const handleSortChange = React.useCallback(
    (value: string) => {
      setParams((prev) => ({ ...prev, sort: value }));
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
    (order: ColumnOrderState) => {
      setColumnOrder(order);
      persistColumnOrder(order);
    },
    [persistColumnOrder],
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

  const roleOptions =
    activeMember?.memberType === "organization"
      ? AGENCY_ROLES
      : LOCATION_ROLES;

  const handleUpdateRole = async () => {
    if (!activeMember) return;
    try {
      await updateMemberRole.mutateAsync({
        memberType: activeMember.memberType,
        memberId: activeMember.id,
        role: selectedRole as
          | "owner"
          | "admin"
          | "manager"
          | "staff"
          | "viewer"
          | "AGENCY"
          | "ADMIN"
          | "MANAGER"
          | "STANDARD"
          | "LIMITED"
          | "VIEWER",
      });
      setRoleDialogOpen(false);
      setActiveMember(null);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to update member role");
    }
  };

  const handleRemoveMember = async () => {
    if (!activeMember) return;
    try {
      await removeMember.mutateAsync({
        memberType: activeMember.memberType,
        memberId: activeMember.id,
      });
      setRemoveDialogOpen(false);
      setActiveMember(null);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to remove member");
    }
  };

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
        initialColumnOrder={memberColumnIds}
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
              initialColumnOrder={memberColumnIds}
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

      <Dialog
        open={roleDialogOpen}
        onOpenChange={(open) => {
          setRoleDialogOpen(open);
          if (!open) {
            setActiveMember(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[420px] px-0 pb-4">
          <DialogHeader className="px-6">
            <DialogTitle>Change member role</DialogTitle>
            <DialogDescription>
              Update access for {activeMember?.name || "this member"}.
            </DialogDescription>
          </DialogHeader>
          <Separator className="bg-black/10 dark:bg-white/5" />
          <div className="grid gap-4 px-6 pt-4">
            <div className="grid gap-2">
              <Label className="text-xs">Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem
                      key={role.value}
                      value={role.value}
                      className="py-4!"
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{role.label}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {role.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-primary/60">
                This takes effect immediately and updates permissions.
              </p>
            </div>
          </div>
          <DialogFooter className="px-6 pt-2">
            <Button variant="ghost" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={!selectedRole || updateMemberRole.isPending}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={removeDialogOpen}
        onOpenChange={(open) => {
          setRemoveDialogOpen(open);
          if (!open) {
            setActiveMember(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              {activeMember?.name || "This member"} will lose access
              immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleRemoveMember}
              disabled={removeMember.isPending}
            >
              Remove member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
