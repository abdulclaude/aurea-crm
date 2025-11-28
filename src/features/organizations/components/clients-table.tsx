"use client";

import type {
  ColumnDef,
  ColumnOrderState,
  SortingState,
  Updater,
  VisibilityState,
} from "@tanstack/react-table";
import { IconContacts as ContactIcon } from "central-icons/IconContacts";
import { IconGroup2 as UsersIcon } from "central-icons/IconGroup2";
import { IconInvite as InviteIcon } from "central-icons/IconInvite";

import { formatDistanceToNow } from "date-fns";
import { ChevronDownIcon, Loader2Icon } from "lucide-react";
import * as React from "react";

import { DataTable } from "@/components/data-table/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { CLIENTS_DEFAULT_SORT } from "@/features/organizations/clients/constants";
import { useClientsInfiniteQuery } from "@/features/organizations/clients/hooks/use-clients-infinite";
import { useClientsParams } from "@/features/organizations/clients/hooks/use-clients-params";
import { ClientsToolbar } from "./clients-toolbar";
import { InviteMemberDialog } from "./invite-member-dialog";

export type ClientMember = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  workflows: number;
  lastActiveAt: string | null;
  role?: string | null;
  roleLabel: string;
  roleKind: "agency" | "client-owner" | "member";
};

export type ClientsTableRow = {
  id: string;
  subaccountId: string;
  name: string;
  slug: string | null;
  logo: string | null;
  profile: {
    billingEmail: string | null;
    website: string | null;
    phone: string | null;
    country: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    timezone: string | null;
    industry: string | null;
  } | null;
  pendingInvites: number;
  isActive: boolean;
  members: ClientMember[];
  workflowsCount: number;
};

const SORTABLE_COLUMNS = new Set(["company", "workflowsCount", "country"]);

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

const toggleValue = (values: string[], value: string) => {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
};

const clientColumns: ColumnDef<ClientsTableRow>[] = [
  {
    id: "company",
    accessorFn: (row) => row.name,
    header: "Company name",
    meta: { label: "Company name" },
    enableHiding: false,
    enableSorting: true,
    cell: ({ row }) => <CompanyCell client={row.original} />,
  },
  {
    id: "email",
    accessorFn: (row) => row.profile?.billingEmail ?? "",
    header: "Email",
    meta: { label: "Email" },
    enableSorting: false,
    cell: ({ row }) => <EmailCell email={row.original.profile?.billingEmail} />,
  },
  {
    id: "website",
    accessorFn: (row) => row.profile?.website ?? "",
    header: "Website",
    meta: { label: "Website" },
    enableSorting: false,
    cell: ({ row }) => <WebsiteCell url={row.original.profile?.website} />,
  },
  {
    id: "phone",
    accessorFn: (row) => row.profile?.phone ?? "",
    header: "Phone",
    meta: { label: "Phone" },
    enableSorting: false,
    cell: ({ row }) => <PhoneCell phone={row.original.profile?.phone} />,
  },
  {
    id: "country",
    accessorFn: (row) => row.profile?.country ?? "",
    header: "Country",
    meta: { label: "Country" },
    cell: ({ row }) => (
      <span className="text-xs text-primary">
        {row.original.profile?.country ?? "—"}
      </span>
    ),
  },
  {
    id: "industry",
    accessorFn: (row) => row.profile?.industry ?? "",
    header: "Industry",
    meta: { label: "Industry" },
    cell: ({ row }) => (
      <span className="text-xs text-primary">
        {row.original.profile?.industry ?? "—"}
      </span>
    ),
  },
  {
    id: "members",
    header: "Team members",
    meta: { label: "Members" },
    enableSorting: false,
    cell: ({ row }) => (
      <MembersMenu
        members={row.original.members}
        pendingInvites={row.original.pendingInvites}
        subaccountId={row.original.subaccountId}
      />
    ),
  },
  {
    id: "workflowsCount",
    accessorFn: (row) => row.workflowsCount,
    header: "Workflows",
    meta: { label: "Workflows" },
    enableSorting: true,
    cell: ({ row }) => (
      <WorkflowsCell
        count={row.original.workflowsCount}
        pendingInvites={row.original.pendingInvites}
      />
    ),
  },
];

const PRIMARY_COLUMN_ID = "company";
const CLIENT_COLUMN_IDS = clientColumns.map(
  (column, index) => (column.id ?? `column-${index}`) as string,
);
const COLUMN_ORDER_STORAGE_KEY = "clients-table.column-order";

export function ClientsTable() {
  const [params, setParams] = useClientsParams();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useClientsInfiniteQuery(params);

  const pages = data?.pages ?? [];
  const rows = React.useMemo(
    () => pages.flatMap((page) => page.items),
    [pages],
  );

  const sortingState = React.useMemo(
    () => sortValueToState(params.sort),
    [params.sort],
  );
  const searchValue = params.search ?? "";
  const selectedCountries = params.countries ?? [];
  const selectedIndustries = params.industries ?? [];
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

  const handleSortChange = React.useCallback(
    (value: string) => {
      setParams((prev) => ({ ...prev, sort: value }));
    },
    [setParams],
  );

  const handleSearchChange = React.useCallback(
    (value: string) => {
      setParams((prev) => ({ ...prev, search: value }));
    },
    [setParams],
  );

  const handleClearFilters = React.useCallback(() => {
    setParams((prev) => ({
      ...prev,
      countries: [],
      industries: [],
    }));
  }, [setParams]);

  const handleApplyAllFilters = React.useCallback(
    (filters: { countries: string[]; industries: string[] }) => {
      setParams((prev) => ({
        ...prev,
        countries: filters.countries,
        industries: filters.industries,
      }));
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

  const loaderRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!loaderRef.current || !hasNextPage) return;
    const node = loaderRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const isInitialLoading = rows.length === 0 && isFetchingNextPage;

  return (
    <div className="space-y-4">
      <DataTable
        data={rows}
        columns={clientColumns}
        isLoading={isInitialLoading}
        getRowId={(row) => row.subaccountId}
        sorting={sortingState}
        onSortingChange={handleSortingChange}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        columnOrder={columnOrder}
        onColumnOrderChange={handleColumnOrderChange}
        initialColumnOrder={CLIENT_COLUMN_IDS}
        initialSorting={[{ id: "company", desc: false }]}
        emptyState={
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-xs text-primary/80 dark:text-white/50 leading-4.5">
            No clients have been added yet. <br /> Start by adding a client.
          </div>
        }
        toolbar={{
          filters: (ctx) => (
            <ClientsToolbar
              search={searchValue}
              onSearchChange={handleSearchChange}
              sortValue={params.sort ?? CLIENTS_DEFAULT_SORT}
              onSortChange={handleSortChange}
              table={ctx.table}
              columnVisibility={columnVisibility}
              columnOrder={columnOrder}
              onColumnOrderChange={handleColumnOrderChange}
              initialColumnOrder={CLIENT_COLUMN_IDS}
              selectedCountries={selectedCountries}
              selectedIndustries={selectedIndustries}
              onApplyAllFilters={handleApplyAllFilters}
              onClearFilters={handleClearFilters}
            />
          ),
        }}
      />

      {rows.length > 0 && (
        <div
          ref={hasNextPage ? loaderRef : undefined}
          className="flex justify-center py-3 text-xs text-primary bg-primary-foreground border-black/10 dark:border-white/5 w-max mx-auto px-6 rounded-sm select-none"
        >
          {isFetchingNextPage ? (
            <>
              <Loader2Icon className="size-3 animate-spin" />
              Loading more clients...
            </>
          ) : hasNextPage ? (
            "Scroll to load more clients"
          ) : (
            "You're all caught up"
          )}
        </div>
      )}
    </div>
  );
}

function CompanyCell({ client }: { client: ClientsTableRow }) {
  return (
    <div className="flex items-center gap-3 ">
      <Avatar className="size-6">
        {client.logo ? (
          <AvatarImage
            src={client.logo}
            alt={client.name}
            className="object-scale-down"
          />
        ) : (
          <AvatarFallback>
            {(client.name?.[0] ?? "C").toUpperCase()}
          </AvatarFallback>
        )}
      </Avatar>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-xs font-medium">{client.name}</span>
          {client.isActive && (
            <Badge variant="secondary" className="text-[10px] uppercase">
              Active
            </Badge>
          )}
          {/* {client.pendingInvites > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {client.pendingInvites} invite
              {client.pendingInvites > 1 ? "s" : ""}
            </Badge>
          )} */}
        </div>
      </div>
    </div>
  );
}

function EmailCell({ email }: { email?: string | null }) {
  if (!email) return <span className="text-xs text-primary">—</span>;
  return (
    <a
      href={`mailto:${email}`}
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      {email}
    </a>
  );
}

function WebsiteCell({ url }: { url?: string | null }) {
  if (!url) return <span className="text-xs text-primary">—</span>;
  const domain = getDomainFromUrl(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs text-sky-500 underline hover:underline"
    >
      {domain ?? url}
    </a>
  );
}

function PhoneCell({ phone }: { phone?: string | null }) {
  if (!phone) return <span className="text-xs text-primary">—</span>;
  return (
    <a
      href={`tel:${phone}`}
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      {phone}
    </a>
  );
}

type MembersMenuProps = {
  members: ClientMember[];
  pendingInvites: number;
  subaccountId: string;
};

function MembersMenu({
  members,
  pendingInvites,
  subaccountId,
}: MembersMenuProps) {
  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false);

  const activeMembers = React.useMemo(
    () =>
      [...members].sort((a, b) => {
        const aTime = a.lastActiveAt ? Date.parse(a.lastActiveAt) : 0;
        const bTime = b.lastActiveAt ? Date.parse(b.lastActiveAt) : 0;
        return bTime - aTime;
      }),
    [members],
  );

  const totalMembersLabel = `${members.length} member${
    members.length === 1 ? "" : "s"
  }`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className=" h-8 relative"
            type="button"
          >
            <UsersIcon className="size-3.5" />
            {totalMembersLabel}
            {pendingInvites > 0 && (
              <Badge
                variant="destructive"
                className="text-[10px] absolute -top-2 -right-2 border-2 border-white rounded-full px-1.5 py-0.5"
              >
                {pendingInvites}
              </Badge>
            )}
            <ChevronDownIcon className="size-3 opacity-70" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="w-72 bg-background border-black/10 dark:border-white/5 rounded-lg"
        >
          <DropdownMenuLabel className="text-xs font-medium text-primary/80 dark:text-white/50">
            Assigned members
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />
          {activeMembers.length === 0 ? (
            <DropdownMenuItem disabled className="text-xs text-primary/50">
              No members yet — invite someone from your team.
            </DropdownMenuItem>
          ) : (
            activeMembers.map((member) => {
              const lastActive = member.lastActiveAt
                ? formatDistanceToNow(new Date(member.lastActiveAt), {
                    addSuffix: true,
                  })
                : "No activity yet";
              return (
                <DropdownMenuSub key={member.id}>
                  <DropdownMenuSubTrigger className="gap-2 hover:bg-primary-foreground/50 text-primary">
                    <Avatar className="size-7">
                      {member.image ? (
                        <AvatarImage
                          src={member.image}
                          alt={member.name ?? ""}
                        />
                      ) : (
                        <AvatarFallback className="bg-[#202e32] text-white brightness-110">
                          {(member.name?.[0] ?? "U").toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>

                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-xs font-medium">
                        {member.name ?? "Unknown"}
                      </span>
                      <span className="truncate text-[11px] text-primary/75">
                        {member.roleKind === "agency"
                          ? "Agency"
                          : member.roleKind === "client-owner"
                            ? "Client owner"
                            : "Member"}
                      </span>
                    </div>
                  </DropdownMenuSubTrigger>

                  <DropdownMenuSubContent className="w-60 bg-background border-black/10 dark:border-white/5 rounded-lg mr-3 p-0">
                    <DropdownMenuItem className="gap-2 hover:bg-primary-foreground/50 text-xs text-primary p-3 rounded-none">
                      <ContactIcon className="size-3.5" />
                      Set as point of contact
                    </DropdownMenuItem>

                    <Separator className="bg-black/5 dark:bg-white/5" />

                    <DropdownMenuItem
                      disabled
                      className="text-[11px] text-primary/75 p-3"
                    >
                      {lastActive}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              );
            })
          )}
          <DropdownMenuSeparator className="bg-black/5 dark:bg-white/5" />

          <DropdownMenuItem
            onClick={() => setInviteDialogOpen(true)}
            className="gap-3 text-xs hover:bg-primary-foreground px-4.5 text-primary/75 group hover:text-primary!"
          >
            <InviteIcon className="size-3.5 text-primary/75 group-hover:text-primary" />
            <p className="text-primary/75 group-hover:text-primary!">
              Invite member to workspace
            </p>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        mode="subaccount"
        subaccountId={subaccountId}
      />
    </>
  );
}

function WorkflowsCell({
  count,
  pendingInvites,
}: {
  count: number;
  pendingInvites: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-primary">
        {count} workflow{count === 1 ? "" : "s"}
      </span>
    </div>
  );
}

function getDomainFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
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
