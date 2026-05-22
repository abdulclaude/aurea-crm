"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnOrderState,
  Updater,
  VisibilityState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { MoreHorizontal, Trash2, Users } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";
import { HouseholdsToolbar } from "./households-toolbar";

type RouterOutput = inferRouterOutputs<AppRouter>;
type HouseholdRow = RouterOutput["households"]["list"][number];

const householdColumns: ColumnDef<HouseholdRow>[] = [
  {
    id: "name",
    accessorFn: (row) => row.name,
    header: "Household",
    meta: { label: "Household" },
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-medium text-primary truncate">
          {row.original.name}
        </span>
      </div>
    ),
  },
  {
    id: "primaryContact",
    accessorFn: (row) => row.primaryContact?.name ?? "",
    header: "Primary client",
    meta: { label: "Primary client" },
    cell: ({ row }) => {
      const pc = row.original.primaryContact;
      return (
        <span className="text-xs truncate">{pc?.name ?? "Not assigned"}</span>
      );
    },
  },
  {
    id: "members",
    accessorFn: (row) => row.members.length,
    header: "Clients",
    meta: { label: "Clients" },
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        {row.original.members.length > 0 && (
          <span className="text-xs text-primary truncate max-w-[200px]">
            {row.original.members.map((m) => m.client.name).join(", ")}
          </span>
        )}
      </div>
    ),
  },
  {
    id: "notes",
    accessorFn: (row) => row.notes ?? "",
    header: "Notes",
    meta: { label: "Notes" },
    cell: ({ row }) => (
      <span className="text-xs truncate max-w-[200px] block">
        {row.original.notes || "—"}
      </span>
    ),
  },
  {
    id: "updatedAt",
    accessorFn: (row) => row.updatedAt,
    header: "Updated",
    meta: { label: "Updated" },
    cell: ({ row }) => (
      <span className="text-xs whitespace-nowrap">
        {format(new Date(row.original.updatedAt), "MMM d, yyyy")}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    enableHiding: false,
    cell: function ActionsCell({ row }) {
      const trpc = useTRPC();
      const queryClient = useQueryClient();
      const removeMember = useMutation(
        trpc.households.removeMember.mutationOptions({
          onSuccess: async () => {
            await queryClient.invalidateQueries();
            toast.success("Member removed");
          },
          onError: (err) => toast.error(err.message),
        }),
      );

      const members = row.original.members;
      if (members.length === 0) return null;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7">
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {members.map((member) => (
              <DropdownMenuItem
                key={member.id}
                onClick={() =>
                  removeMember.mutate({
                    householdId: row.original.id,
                    clientId: member.clientId,
                  })
                }
              >
                <Trash2 className="size-3.5 text-destructive" />
                Remove {member.client.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

const HOUSEHOLD_COLUMN_IDS = householdColumns.map(
  (col, i) => (col.id ?? `column-${i}`) as string,
);
const COLUMN_ORDER_KEY = "households-table.column-order";
const DEFAULT_SORT = "updatedAt.desc";

export function HouseholdsTable() {
  const trpc = useTRPC();
  const { data: households } = useSuspenseQuery(
    trpc.households.list.queryOptions(),
  );

  const [search, setSearch] = React.useState("");
  const [sortValue, setSortValue] = React.useState(DEFAULT_SORT);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(HOUSEHOLD_COLUMN_IDS);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(COLUMN_ORDER_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setColumnOrder(parsed);
    } catch {
      // ignore
    }
  }, []);

  const persistColumnOrder = React.useCallback((order: string[]) => {
    if (typeof window === "undefined") return;
    if (
      order.length === HOUSEHOLD_COLUMN_IDS.length &&
      order.every((id, i) => id === HOUSEHOLD_COLUMN_IDS[i])
    ) {
      window.localStorage.removeItem(COLUMN_ORDER_KEY);
    } else {
      window.localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(order));
    }
  }, []);

  const handleColumnOrderChange = React.useCallback(
    (updater: Updater<ColumnOrderState> | ColumnOrderState) => {
      const next =
        typeof updater === "function"
          ? (updater as (prev: ColumnOrderState) => ColumnOrderState)(
              columnOrder,
            )
          : updater;
      setColumnOrder(next);
      persistColumnOrder(next);
    },
    [columnOrder, persistColumnOrder],
  );

  const filtered = React.useMemo(() => {
    let result = [...households];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.primaryContact?.name?.toLowerCase().includes(q) ||
          h.members.some((m) => m.client.name.toLowerCase().includes(q)),
      );
    }

    const [col, dir] = sortValue.split(".");
    result.sort((a, b) => {
      let cmp = 0;
      if (col === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (col === "members") {
        cmp = a.members.length - b.members.length;
      } else {
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return dir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [households, search, sortValue]);

  return (
    <DataTable
      columns={householdColumns}
      data={filtered}
      getRowId={(row) => row.id}
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={setColumnVisibility}
      columnOrder={columnOrder}
      onColumnOrderChange={handleColumnOrderChange}
      initialColumnOrder={HOUSEHOLD_COLUMN_IDS}
      enableGlobalSearch={false}
      toolbar={{
        filters: (ctx) => (
          <HouseholdsToolbar
            search={search}
            onSearchChange={setSearch}
            sortValue={sortValue}
            onSortChange={setSortValue}
            table={ctx.table}
            columnVisibility={columnVisibility}
            columnOrder={columnOrder}
            onColumnOrderChange={handleColumnOrderChange}
            initialColumnOrder={HOUSEHOLD_COLUMN_IDS}
          />
        ),
      }}
      emptyState={
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="size-8 text-primary/20 mb-3" />
          <p className="text-sm font-medium text-primary">No households yet</p>
          <p className="text-xs text-primary/55 mt-1">
            Create one to manage family or dependent accounts together.
          </p>
        </div>
      }
    />
  );
}
