"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnOrderState,
  VisibilityState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import {
  Ban,
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  TicketPercent,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageTabs } from "@/components/ui/page-tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { StudioTableToolbar } from "@/features/studio/components/studio-table-toolbar";
import { useTRPC } from "@/trpc/client";
import { PromoCodeDialog } from "./promo-code-dialog";
import { PromoCodeEditDialog } from "./promo-code-edit-dialog";
import { RecentPromoRedemptionsTable } from "./recent-promo-redemptions-table";
import { formatDiscount, statusLabel } from "./helpers";
import type { PromoCodeRow } from "./types";

const COLUMN_ORDER_KEY = "promo-codes.column-order";
const PRIMARY_COLUMN_ID = "code";
const DEFAULT_COLUMN_ORDER = [
  "code",
  "status",
  "discount",
  "redemptions",
  "appliesTo",
  "expires",
  "actions",
] as const;

function statusColor(row: PromoCodeRow): string {
  const status = statusLabel(row);
  if (status === "Active") return "#10b981";
  if (status === "Expired") return "#f43f5e";
  if (status === "Maxed") return "#f59e0b";
  return "#94a3b8";
}

export function PromoCodesPageClient() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingPromoCode, setEditingPromoCode] =
    React.useState<PromoCodeRow | null>(null);
  const [deactivatingPromoCode, setDeactivatingPromoCode] =
    React.useState<PromoCodeRow | null>(null);
  const [activeTab, setActiveTab] = React.useState("promo-codes");
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("code.asc");
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [discountFilter, setDiscountFilter] = React.useState<string[]>([]);
  const [targetFilter, setTargetFilter] = React.useState<string[]>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);

  const promosQuery = useQuery(
    trpc.promoCodes.list.queryOptions({ includeInactive: true }),
  );
  const pricingOptionsQuery = useQuery(
    trpc.pricingOptions.list.queryOptions({ includeInactive: true }),
  );

  const pricingOptionsById = React.useMemo(() => {
    return new Map(
      (pricingOptionsQuery.data ?? []).map((option) => [option.id, option]),
    );
  }, [pricingOptionsQuery.data]);

  const createMutation = useMutation(
    trpc.promoCodes.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.promoCodes.list.queryOptions({ includeInactive: true }),
        );
        toast.success("Promo code created");
        setDialogOpen(false);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deactivateMutation = useMutation(
    trpc.promoCodes.deactivate.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.promoCodes.list.queryOptions({ includeInactive: true }),
        );
        toast.success("Promo code deactivated");
        setDeactivatingPromoCode(null);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.promoCodes.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.promoCodes.list.queryOptions({ includeInactive: true }),
        );
        toast.success("Promo code updated");
        setEditingPromoCode(null);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const rows = React.useMemo(() => {
    let allRows = promosQuery.data ?? [];

    if (statusFilter.length > 0) {
      allRows = allRows.filter((row) =>
        statusFilter.includes(statusLabel(row).toLowerCase()),
      );
    }
    if (discountFilter.length > 0) {
      allRows = allRows.filter((row) =>
        discountFilter.includes(row.discountType),
      );
    }
    if (targetFilter.length > 0) {
      allRows = allRows.filter((row) => {
        const hasTargets = (row.applicablePricingOptionIds ?? []).length > 0;
        return targetFilter.includes(hasTargets ? "selected" : "all");
      });
    }
    if (search.trim()) {
      const query = search.toLowerCase();
      allRows = allRows.filter((row) => {
        const targetNames = (row.applicablePricingOptionIds ?? [])
          .map((id) => pricingOptionsById.get(id)?.name ?? "")
          .join(" ");
        return `${row.code} ${targetNames}`.toLowerCase().includes(query);
      });
    }

    const [column, direction] = sort.split(".");
    allRows = [...allRows].sort((a, b) => {
      let comparison = 0;
      if (column === "code") comparison = a.code.localeCompare(b.code);
      if (column === "discount") {
        comparison = Number(a.discountValue) - Number(b.discountValue);
      }
      if (column === "redemptions") {
        comparison = a.redemptionCount - b.redemptionCount;
      }
      if (column === "expires") {
        comparison =
          new Date(a.expiresAt ?? "9999-12-31").getTime() -
          new Date(b.expiresAt ?? "9999-12-31").getTime();
      }
      return direction === "desc" ? -comparison : comparison;
    });

    return allRows;
  }, [
    discountFilter,
    pricingOptionsById,
    promosQuery.data,
    search,
    sort,
    statusFilter,
    targetFilter,
  ]);

  const columns = React.useMemo<ColumnDef<PromoCodeRow>[]>(
    () => [
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
              aria-label={`Copy promo code ${row.original.code}`}
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
        header: "Status",
        meta: { label: "Status" },
        cell: ({ row }) => {
          const color = statusColor(row.original);
          return (
            <Badge
              variant="outline"
              className="text-[10px] ring-0"
              style={{
                backgroundColor: `${color}18`,
                borderColor: `${color}66`,
                color,
                boxShadow: `0 0 0 1px ${color}66`,
              }}
            >
              {statusLabel(row.original)}
            </Badge>
          );
        },
      },
      {
        id: "discount",
        header: "Discount",
        meta: { label: "Discount" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/65">
            {formatDiscount(row.original)}
          </span>
        ),
      },
      {
        id: "redemptions",
        header: "Redemptions",
        meta: { label: "Redemptions" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/65">
            {row.original.redemptionCount}
            {row.original.maxRedemptions !== null
              ? ` / ${row.original.maxRedemptions}`
              : " / unlimited"}
          </span>
        ),
      },
      {
        id: "appliesTo",
        header: "Applies to",
        meta: { label: "Applies to" },
        cell: ({ row }) => {
          const targetIds = row.original.applicablePricingOptionIds ?? [];
          if (targetIds.length === 0) {
            return (
              <span className="text-xs text-primary/65">
                {(row.original.applicablePlanIds ?? []).length > 0
                  ? "Selected membership plans"
                  : "All pricing options"}
              </span>
            );
          }

          return (
            <div className="flex max-w-xs flex-wrap gap-x-2 gap-y-1">
              {targetIds.map((id) => {
                const option = pricingOptionsById.get(id);
                return option ? (
                  <Link
                    key={id}
                    href={`/studio/pricing-options?pricingOptionId=${encodeURIComponent(id)}`}
                    className="truncate text-xs text-primary hover:underline"
                  >
                    {option.name}
                  </Link>
                ) : (
                  <span key={id} className="text-xs text-primary/40">
                    Unavailable option
                  </span>
                );
              })}
            </div>
          );
        },
      },
      {
        id: "expires",
        header: "Expires",
        meta: { label: "Expires" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/65">
            {row.original.expiresAt
              ? format(new Date(row.original.expiresAt), "MMM d, yyyy")
              : "No expiry"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
              >
                <span className="sr-only">Open promo code actions</span>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-xs"
                disabled={updateMutation.isPending}
                onSelect={() => setEditingPromoCode(row.original)}
              >
                <Pencil className="size-3.5" /> Edit
              </DropdownMenuItem>
              {row.original.isActive && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-xs text-amber-600 focus:text-amber-600"
                    disabled={deactivateMutation.isPending}
                    onSelect={() => setDeactivatingPromoCode(row.original)}
                  >
                    <Ban className="size-3.5" /> Deactivate
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [
      deactivateMutation.isPending,
      pricingOptionsById,
      updateMutation.isPending,
    ],
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
    <div className="space-y-0">
      <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary">Promo codes</h1>
          <p className="text-xs text-primary/70">
            Create discounts for POS checkout and pricing-option purchases.
          </p>
        </div>
        {activeTab === "promo-codes" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-3.5" />
            Add promo code
          </Button>
        ) : null}
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <PageTabs
        tabs={[
          { id: "promo-codes", label: "Promo codes" },
          { id: "recent-redemptions", label: "Recent redemptions" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="px-6"
      />

      {activeTab === "recent-redemptions" ? (
        <RecentPromoRedemptionsTable />
      ) : (
        <DataTable
        columns={columns}
        data={rows}
        isLoading={promosQuery.isLoading}
        getRowId={(row) => row.id}
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
              onSearchChange={setSearch}
              searchPlaceholder="Search promo codes..."
              filterGroups={[
                {
                  label: "Status",
                  options: [
                    { value: "active", label: "Active" },
                    { value: "expired", label: "Expired" },
                    { value: "maxed", label: "Maxed" },
                    { value: "inactive", label: "Inactive" },
                  ],
                  selectedValues: statusFilter,
                  onChange: setStatusFilter,
                },
                {
                  label: "Discount",
                  options: [
                    { value: "PERCENT", label: "Percent" },
                    { value: "FIXED", label: "Fixed amount" },
                  ],
                  selectedValues: discountFilter,
                  onChange: setDiscountFilter,
                },
                {
                  label: "Applies to",
                  options: [
                    { value: "all", label: "All pricing options" },
                    { value: "selected", label: "Selected pricing options" },
                  ],
                  selectedValues: targetFilter,
                  onChange: setTargetFilter,
                },
              ]}
              sortOptions={[
                { value: "code.asc", label: "Code A-Z" },
                { value: "code.desc", label: "Code Z-A" },
                { value: "discount.asc", label: "Discount low-high" },
                { value: "discount.desc", label: "Discount high-low" },
                { value: "redemptions.desc", label: "Most redemptions" },
                { value: "redemptions.asc", label: "Fewest redemptions" },
                { value: "expires.asc", label: "Expires soonest" },
                { value: "expires.desc", label: "Expires latest" },
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
            <TicketPercent className="size-8 text-primary/20" />
            <p className="text-sm text-primary/50">
              No promo codes match this view.
            </p>
          </div>
        }
        />
      )}

      <AlertDialog
        open={Boolean(deactivatingPromoCode)}
        onOpenChange={(open) => {
          if (!open && !deactivateMutation.isPending) {
            setDeactivatingPromoCode(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate promo code?</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivatingPromoCode
                ? `${deactivatingPromoCode.code} will no longer be accepted at checkout. You can reactivate it later by editing the promo code.`
                : "This promo code will no longer be accepted at checkout."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivateMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deactivateMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                if (deactivatingPromoCode) {
                  deactivateMutation.mutate({ id: deactivatingPromoCode.id });
                }
              }}
            >
              {deactivateMutation.isPending
                ? "Deactivating..."
                : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PromoCodeDialog
        open={dialogOpen}
        isPending={createMutation.isPending}
        onOpenChange={setDialogOpen}
        onCreate={(input) => createMutation.mutate(input)}
      />
      <PromoCodeEditDialog
        open={Boolean(editingPromoCode)}
        isPending={updateMutation.isPending}
        promoCode={editingPromoCode}
        onOpenChange={(open) => {
          if (!open) setEditingPromoCode(null);
        }}
        onSave={(input) => updateMutation.mutate(input)}
      />
    </div>
  );
}
