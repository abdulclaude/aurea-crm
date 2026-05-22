"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnOrderState,
  VisibilityState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { Copy, Gift, Plus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { StudioTableToolbar } from "@/features/studio/components/studio-table-toolbar";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutput = inferRouterOutputs<AppRouter>;
type GiftCardRow = RouterOutput["giftCards"]["list"]["cards"][number];
type GiftCardStatus = "active" | "redeemed" | "expired" | "inactive";

const PRIMARY_COLUMN_ID = "code";
const COLUMN_ORDER_KEY = "gift-cards-table.column-order";

function formatCurrency(value: unknown, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    Number(value ?? 0),
  );
}

function getStatus(card: GiftCardRow): GiftCardStatus {
  if (Number(card.remainingBalance) <= 0) return "redeemed";
  if (card.expiresAt && new Date(card.expiresAt) < new Date()) return "expired";
  if (card.isActive) return "active";
  return "inactive";
}

function statusTone(status: GiftCardStatus) {
  if (status === "active") return "border-emerald-500/40 text-emerald-500";
  if (status === "expired") return "border-rose-500/40 text-rose-500";
  if (status === "redeemed") return "border-blue-500/40 text-blue-500";
  return "border-primary/20 text-primary/40";
}

function buildColumns(
  onDeactivate: (id: string) => void,
  deactivatePending: boolean,
): ColumnDef<GiftCardRow>[] {
  return [
    {
      id: "code",
      accessorKey: "code",
      header: "Code",
      meta: { label: "Code" },
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <code className="font-mono text-xs font-semibold">
            {row.original.code}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={async () => {
              await navigator.clipboard.writeText(row.original.code);
              toast.success("Code copied");
            }}
          >
            <Copy className="size-3.5" />
          </Button>
        </div>
      ),
    },
    {
      id: "status",
      accessorFn: (row) => getStatus(row),
      header: "Status",
      meta: { label: "Status" },
      cell: ({ row }) => {
        const s = getStatus(row.original);
        return (
          <Badge variant="outline" className={statusTone(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Badge>
        );
      },
    },
    {
      id: "balance",
      accessorFn: (row) => Number(row.remainingBalance),
      header: "Balance",
      meta: { label: "Balance" },
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="text-xs font-medium">
            {formatCurrency(
              row.original.remainingBalance,
              row.original.currency,
            )}
          </p>
          <p className="text-[11px] text-primary/40">
            of{" "}
            {formatCurrency(row.original.initialValue, row.original.currency)}
          </p>
        </div>
      ),
    },
    {
      id: "purchasedBy",
      accessorFn: (row) => row.purchasedBy?.name ?? "",
      header: "Purchased by",
      meta: { label: "Purchased by" },
      cell: ({ row }) => (
        <span className="text-xs text-primary/50">
          {row.original.purchasedBy?.name ?? "Manual issue"}
        </span>
      ),
    },
    {
      id: "redeemedBy",
      accessorFn: (row) => row.redeemedBy?.name ?? "",
      header: "Redeemed by",
      meta: { label: "Redeemed by" },
      cell: ({ row }) => (
        <span className="text-xs text-primary/50">
          {row.original.redeemedBy?.name ?? "Not redeemed"}
        </span>
      ),
    },
    {
      id: "expires",
      accessorKey: "expiresAt",
      header: "Expires",
      meta: { label: "Expires" },
      cell: ({ row }) => (
        <span className="text-xs text-primary/50">
          {row.original.expiresAt
            ? format(new Date(row.original.expiresAt), "MMM d, yyyy")
            : "No expiry"}
        </span>
      ),
    },
    {
      id: "issued",
      accessorKey: "createdAt",
      header: "Issued",
      meta: { label: "Issued" },
      cell: ({ row }) => (
        <span className="text-xs text-primary/50">
          {format(new Date(row.original.createdAt), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) =>
        getStatus(row.original) === "active" ? (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-primary/40 hover:text-rose-500"
              disabled={deactivatePending}
              onClick={() => onDeactivate(row.original.id)}
            >
              Deactivate
            </Button>
          </div>
        ) : null,
    },
  ];
}

export default function GiftCardsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [issueOpen, setIssueOpen] = React.useState(false);
  const [value, setValue] = React.useState("50");
  const [notes, setNotes] = React.useState("");

  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("issued.desc");
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);

  const cardsQuery = useQuery(
    trpc.giftCards.list.queryOptions({ includeRedeemed: true, limit: 100 }),
  );

  const issueMutation = useMutation(
    trpc.giftCards.issue.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        toast.success("Gift card issued");
        setIssueOpen(false);
        setValue("50");
        setNotes("");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deactivateMutation = useMutation(
    trpc.giftCards.deactivate.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        toast.success("Gift card deactivated");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const columns = React.useMemo(
    () =>
      buildColumns(
        (id) => deactivateMutation.mutate({ id }),
        deactivateMutation.isPending,
      ),
    [deactivateMutation],
  );

  const COLUMN_IDS = React.useMemo(
    () => columns.map((c, i) => c.id ?? `col-${i}`),
    [columns],
  );

  React.useEffect(() => {
    setColumnOrder(COLUMN_IDS);
    try {
      const stored = window.localStorage.getItem(COLUMN_ORDER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setColumnOrder(parsed);
      }
    } catch {}
  }, []);

  const filtered = React.useMemo(() => {
    let result = cardsQuery.data?.cards ?? [];

    if (statusFilter.length > 0) {
      result = result.filter((c) => statusFilter.includes(getStatus(c)));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.purchasedBy?.name?.toLowerCase().includes(q) ||
          c.redeemedBy?.name?.toLowerCase().includes(q),
      );
    }

    const [col, dir] = sort.split(".");
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (col === "balance")
        cmp = Number(a.remainingBalance) - Number(b.remainingBalance);
      else if (col === "expires") {
        cmp =
          (a.expiresAt ? new Date(a.expiresAt).getTime() : 0) -
          (b.expiresAt ? new Date(b.expiresAt).getTime() : 0);
      } else if (col === "issued")
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (col === "code") cmp = a.code.localeCompare(b.code);
      return dir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [cardsQuery.data?.cards, search, sort, statusFilter]);

  const columnOrderFinal = columnOrder.length > 0 ? columnOrder : COLUMN_IDS;

  const handleIssue = () => {
    const parsed = Number.parseFloat(value);
    if (Number.isNaN(parsed) || parsed <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    issueMutation.mutate({ value: parsed, notes: notes.trim() || undefined });
  };

  return (
    <div className="space-y-0">
      <div className="flex flex-wrap items-end justify-between gap-4 p-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Gift cards</h1>
          <p className="text-xs text-primary/70">
            Issue and manage gift card codes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIssueOpen(true)}>
          <Plus className="size-3.5" />
          Issue gift card
        </Button>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={cardsQuery.isLoading}
        getRowId={(row) => row.id}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={(updater) =>
          setColumnVisibility(
            typeof updater === "function"
              ? (updater as (s: VisibilityState) => VisibilityState)(
                  columnVisibility,
                )
              : updater,
          )
        }
        columnOrder={columnOrderFinal}
        onColumnOrderChange={(order) => {
          setColumnOrder(order);
          try {
            window.localStorage.setItem(
              COLUMN_ORDER_KEY,
              JSON.stringify(order),
            );
          } catch {}
        }}
        initialColumnOrder={COLUMN_IDS}
        enableGlobalSearch={false}
        toolbar={{
          filters: (ctx) => (
            <StudioTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search gift cards..."
              filterGroups={[
                {
                  label: "Status",
                  options: [
                    { value: "active", label: "Active" },
                    { value: "redeemed", label: "Redeemed" },
                    { value: "expired", label: "Expired" },
                    { value: "inactive", label: "Inactive" },
                  ],
                  selectedValues: statusFilter,
                  onChange: setStatusFilter,
                },
              ]}
              sortOptions={[
                { value: "issued.desc", label: "Issued newest" },
                { value: "issued.asc", label: "Issued oldest" },
                { value: "balance.desc", label: "Balance high–low" },
                { value: "balance.asc", label: "Balance low–high" },
                { value: "expires.asc", label: "Expires soonest" },
                { value: "expires.desc", label: "Expires latest" },
                { value: "code.asc", label: "Code A–Z" },
              ]}
              sortValue={sort}
              onSortChange={setSort}
              table={ctx.table}
              columnVisibility={columnVisibility}
              columnOrder={columnOrderFinal}
              onColumnOrderChange={(order) => {
                setColumnOrder(order);
                try {
                  window.localStorage.setItem(
                    COLUMN_ORDER_KEY,
                    JSON.stringify(order),
                  );
                } catch {}
              }}
              initialColumnOrder={COLUMN_IDS}
              primaryColumnId={PRIMARY_COLUMN_ID}
            />
          ),
        }}
        emptyState={
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Gift className="mb-3 size-8 text-primary" />
            <p className="text-sm text-primary/50">No gift cards found.</p>
          </div>
        }
      />

      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Issue gift card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Value (£)</Label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="50"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                placeholder="Birthday gift"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleIssue} disabled={issueMutation.isPending}>
              {issueMutation.isPending ? "Issuing..." : "Issue card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
