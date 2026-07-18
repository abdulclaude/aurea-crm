"use client";

import { format } from "date-fns";
import type { inferRouterOutputs } from "@trpc/server";
import type {
  ColumnDef,
  ColumnOrderState,
  VisibilityState,
} from "@tanstack/react-table";
import { MoreHorizontal, ReceiptText, WalletCards } from "lucide-react";
import * as React from "react";

import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StudioTableToolbar } from "@/features/studio/components/studio-table-toolbar";
import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutput = inferRouterOutputs<AppRouter>;
type BalanceRow =
  RouterOutput["studioBilling"]["listAccountCreditBalances"][number];

const COLUMN_ORDER_KEY = "account-credit-balances.column-order";
const PRIMARY_COLUMN_ID = "client";
const DEFAULT_COLUMN_ORDER = [
  "client",
  "balance",
  "updated",
  "actions",
] as const;

function formatCurrency(amount: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    amount,
  );
}

type AccountCreditBalancesTableProps = {
  rows: BalanceRow[];
  isLoading: boolean;
  search: string;
  selectedClientId: string | null;
  onSearchChange: (value: string) => void;
  onSelect: (client: {
    id: string;
    name: string;
    email: string | null;
  }) => void;
};

export function AccountCreditBalancesTable({
  rows,
  isLoading,
  search,
  selectedClientId,
  onSearchChange,
  onSelect,
}: AccountCreditBalancesTableProps) {
  const [sort, setSort] = React.useState("client.asc");
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);

  const sortedRows = React.useMemo(() => {
    const [column, direction] = sort.split(".");
    const nextRows = [...rows].sort((a, b) => {
      let comparison = 0;
      if (column === "client")
        comparison = a.clientName.localeCompare(b.clientName);
      if (column === "balance") comparison = a.balance - b.balance;
      if (column === "updated") {
        comparison =
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return direction === "desc" ? -comparison : comparison;
    });
    return nextRows;
  }, [rows, sort]);

  const columns = React.useMemo<ColumnDef<BalanceRow>[]>(
    () => [
      {
        id: "client",
        accessorKey: "clientName",
        header: "Client",
        meta: { label: "Client" },
        enableHiding: false,
        cell: ({ row }) => (
          <div>
            <p className="text-xs font-medium text-primary">
              {row.original.clientName}
            </p>
            <p className="text-xs text-primary/50">
              {row.original.clientEmail ?? "No email"}
            </p>
          </div>
        ),
      },
      {
        id: "balance",
        accessorKey: "balance",
        header: "Balance",
        meta: { label: "Balance" },
        cell: ({ row }) => (
          <span className="text-xs font-medium text-primary">
            {formatCurrency(row.original.balance, row.original.currency)}
          </span>
        ),
      },
      {
        id: "updated",
        accessorKey: "updatedAt",
        header: "Updated",
        meta: { label: "Updated" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/60">
            {format(new Date(row.original.updatedAt), "MMM d, yyyy h:mm a")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        cell: ({ row }) => (
          <div
            className="flex justify-end"
            onClick={(event) => event.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                >
                  <span className="sr-only">
                    Open actions for {row.original.clientName}
                  </span>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">
                  Actions
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-xs"
                  onSelect={() =>
                    onSelect({
                      id: row.original.clientId,
                      name: row.original.clientName,
                      email: row.original.clientEmail,
                    })
                  }
                >
                  <ReceiptText className="size-3.5" /> View details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [onSelect],
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
    <DataTable
      columns={columns}
      data={sortedRows}
      isLoading={isLoading}
      getRowId={(row) => row.id}
      onRowClick={(row) =>
        onSelect({
          id: row.clientId,
          name: row.clientName,
          email: row.clientEmail,
        })
      }
      rowSelection={
        selectedClientId
          ? Object.fromEntries(
              rows
                .filter((row) => row.clientId === selectedClientId)
                .map((row) => [row.id, true]),
            )
          : {}
      }
      onRowSelectionChange={() => {}}
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
            onSearchChange={onSearchChange}
            searchPlaceholder="Search balances..."
            sortOptions={[
              { value: "client.asc", label: "Client A-Z" },
              { value: "client.desc", label: "Client Z-A" },
              { value: "balance.desc", label: "Highest balance" },
              { value: "balance.asc", label: "Lowest balance" },
              { value: "updated.desc", label: "Recently updated" },
              { value: "updated.asc", label: "Least recently updated" },
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
          <WalletCards className="size-8 text-primary/20" />
          <p className="text-sm text-primary/50">
            No account credit balances match this view.
          </p>
        </div>
      }
    />
  );
}
