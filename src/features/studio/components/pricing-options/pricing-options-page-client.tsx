"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnOrderState,
  VisibilityState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import {
  Archive,
  CreditCard,
  LinkIcon,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { Button } from "@/components/ui/button";
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
import type { AppRouter } from "@/trpc/routers/_app";
import type { PricingType } from "./pricing-option-create-constants";
import {
  getPricingTypeColor,
  PricingOptionCheckoutBadge,
  PricingOptionStatusBadge,
  PricingOptionTypeBadge,
} from "./pricing-option-badges";

const PRICING_TYPES = [
  { value: "CLASS_PACK", label: "Class pack" },
  { value: "MEMBERSHIP", label: "Membership" },
  { value: "BUNDLE", label: "Bundle" },
  { value: "DROP_IN", label: "Drop-in" },
  { value: "INTRO_OFFER", label: "Intro offer" },
  { value: "ACCOUNT_CREDIT", label: "Account credit" },
] as const;

const BILLING_INTERVALS = [
  { value: "ONE_TIME", label: "One-time" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUALLY", label: "Annually" },
] as const;

const COLUMN_ORDER_KEY = "pricing-options.column-order.v2";
const PRIMARY_COLUMN_ID = "name";
const DEFAULT_COLUMN_ORDER = [
  "name",
  "description",
  "status",
  "type",
  "price",
  "access",
  "channels",
  "checkout",
  "buyPage",
  "actions",
] as const;

type RouterOutput = inferRouterOutputs<AppRouter>;
type PricingOptionRow = RouterOutput["pricingOptions"]["list"][number];

function money(value: unknown, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    Number(value ?? 0),
  );
}

function billingIntervalLabel(value: string): string {
  return (
    BILLING_INTERVALS.find((interval) => interval.value === value)?.label ??
    value
  );
}

export function PricingOptionsPageClient() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const targetOptionId = searchParams.get("pricingOptionId");
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("name.asc");
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [visibilityFilter, setVisibilityFilter] = React.useState<string[]>([]);
  const [channelFilter, setChannelFilter] = React.useState<string[]>([]);
  const [typeFilter, setTypeFilter] = React.useState<string[]>([]);
  const [billingFilter, setBillingFilter] = React.useState<string[]>([]);
  const [checkoutFilter, setCheckoutFilter] = React.useState<string[]>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [syncingOptionId, setSyncingOptionId] = React.useState<string | null>(
    null,
  );
  const [archivingOption, setArchivingOption] =
    React.useState<PricingOptionRow | null>(null);

  const optionsQuery = useQuery(
    trpc.pricingOptions.list.queryOptions({ includeInactive: true }),
  );
  const syncOption = useMutation(
    trpc.studioBilling.syncPricingOptionWithStripe.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.pricingOptions.list.queryOptions({ includeInactive: true }),
        );
        await queryClient.invalidateQueries(
          trpc.pricingOptions.list.queryOptions({
            includeInactive: false,
            posOnly: true,
          }),
        );
        toast.success("Pricing option synced with Stripe");
        setSyncingOptionId(null);
      },
      onError: (error) => {
        toast.error(error.message);
        setSyncingOptionId(null);
      },
    }),
  );
  const archiveOption = useMutation(
    trpc.pricingOptions.archive.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.pricingOptions.list.queryOptions({ includeInactive: true }),
        );
        setArchivingOption(null);
        toast.success("Pricing option archived");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function handleSync(optionId: string): void {
    setSyncingOptionId(optionId);
    syncOption.mutate({ pricingOptionId: optionId });
  }

  const options = React.useMemo(() => {
    let rows = optionsQuery.data ?? [];

    if (targetOptionId) {
      rows = rows.filter((option) => option.id === targetOptionId);
    }

    if (statusFilter.length > 0) {
      rows = rows.filter((option) =>
        statusFilter.includes(option.isActive ? "active" : "inactive"),
      );
    }
    if (visibilityFilter.length > 0) {
      rows = rows.filter((option) =>
        visibilityFilter.includes(option.isPublic ? "public" : "hidden"),
      );
    }
    if (channelFilter.length > 0) {
      rows = rows.filter((option) =>
        channelFilter.some((channel) => {
          if (channel === "public") return option.isPublic;
          if (channel === "pos") return option.showInPos;
          if (channel === "direct") return option.directPurchaseEnabled;
          if (channel === "hidden") {
            return (
              !option.isPublic &&
              !option.showInPos &&
              !option.directPurchaseEnabled
            );
          }
          return false;
        }),
      );
    }
    if (typeFilter.length > 0) {
      rows = rows.filter((option) => typeFilter.includes(option.type));
    }
    if (billingFilter.length > 0) {
      rows = rows.filter((option) =>
        billingFilter.includes(option.billingInterval),
      );
    }
    if (checkoutFilter.length > 0) {
      rows = rows.filter((option) =>
        checkoutFilter.some((checkout) => {
          const checkoutBacked = Boolean(option.membershipPlanId);
          const stripeSynced = Boolean(option.stripePriceId);
          if (checkout === "direct") return option.type === "ACCOUNT_CREDIT";
          if (checkout === "synced") return stripeSynced;
          if (checkout === "needs-sync") {
            return (
              checkoutBacked &&
              option.type !== "ACCOUNT_CREDIT" &&
              !stripeSynced
            );
          }
          if (checkout === "not-backed") return !checkoutBacked;
          return false;
        }),
      );
    }
    if (search.trim()) {
      const query = search.toLowerCase();
      rows = rows.filter((option) =>
        [
          option.name,
          option.description,
          option.type,
          option.revenueCategory,
          option.accessSummary,
          option.buyPagePath,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(query)),
      );
    }

    const [column, direction] = sort.split(".");
    rows = [...rows].sort((a, b) => {
      let comparison = 0;
      if (column === "name") comparison = a.name.localeCompare(b.name);
      if (column === "price") comparison = Number(a.price) - Number(b.price);
      if (column === "access")
        comparison = a.accessGrantCount - b.accessGrantCount;
      if (column === "type") comparison = a.type.localeCompare(b.type);
      return direction === "desc" ? -comparison : comparison;
    });

    return rows;
  }, [
    billingFilter,
    channelFilter,
    checkoutFilter,
    optionsQuery.data,
    search,
    sort,
    statusFilter,
    typeFilter,
    targetOptionId,
    visibilityFilter,
  ]);

  const columns = React.useMemo<ColumnDef<PricingOptionRow>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Pricing option",
        meta: { label: "Pricing option" },
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{
                backgroundColor: getPricingTypeColor(
                  row.original.type as PricingType,
                ),
              }}
            />
            <div className="space-y-1">
              <Link
                href={`/studio/pricing-options/${row.original.id}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                {row.original.name}
              </Link>
            </div>
          </div>
        ),
      },
      {
        id: "description",
        accessorKey: "description",
        header: "Description",
        meta: { label: "Description" },
        cell: ({ row }) => (
          <span className="block max-w-xs truncate text-xs text-primary/65">
            {row.original.description ?? "No description"}
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: (row) => (row.isActive ? "Active" : "Inactive"),
        header: "Status",
        meta: { label: "Status" },
        cell: ({ row }) => (
          <PricingOptionStatusBadge active={row.original.isActive} />
        ),
      },
      {
        id: "type",
        accessorKey: "type",
        header: "Type",
        meta: { label: "Type" },
        cell: ({ row }) => (
          <PricingOptionTypeBadge type={row.original.type as PricingType} />
        ),
      },
      {
        id: "price",
        accessorFn: (row) => Number(row.price),
        header: "Price",
        meta: { label: "Price" },
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="text-xs font-medium text-primary">
              {money(row.original.price, row.original.currency)}
            </p>
            <p className="text-[11px] text-primary/40">
              {billingIntervalLabel(row.original.billingInterval)}
            </p>
          </div>
        ),
      },
      {
        id: "access",
        accessorFn: (row) =>
          row.accessSummary ?? `${row.accessGrantCount} rules`,
        header: "Access",
        meta: { label: "Access" },
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="max-w-xs truncate text-xs text-primary/60">
              {row.original.accessSummary ??
                `${row.original.accessGrantCount} rules`}
            </p>
            <p className="text-[11px] text-primary/40">
              {row.original.classCredits
                ? `${row.original.classCredits} credits`
                : "No credit limit"}
              {row.original.durationDays
                ? ` · ${row.original.durationDays} days`
                : ""}
            </p>
          </div>
        ),
      },
      {
        id: "channels",
        header: "Channels",
        meta: { label: "Channels" },
        cell: ({ row }) => {
          const channels = [
            row.original.isPublic ? "Public" : null,
            row.original.showInPos ? "POS" : null,
            row.original.directPurchaseEnabled ? "Direct" : null,
          ].filter((channel): channel is string => Boolean(channel));

          return (
            <span className="text-xs text-primary/50">
              {channels.length > 0 ? channels.join(", ") : "Hidden"}
            </span>
          );
        },
      },
      {
        id: "checkout",
        header: "Checkout",
        meta: { label: "Checkout" },
        cell: ({ row }) => (
          <PricingOptionCheckoutBadge
            type={row.original.type as PricingType}
            membershipPlanId={row.original.membershipPlanId}
            stripePriceId={row.original.stripePriceId}
          />
        ),
      },
      {
        id: "buyPage",
        accessorKey: "buyPagePath",
        header: "Buy page",
        meta: { label: "Buy page" },
        cell: ({ row }) =>
          row.original.buyPagePath ? (
            <span className="inline-flex max-w-xs items-center gap-1 truncate text-xs text-primary/50">
              <LinkIcon className="size-3 shrink-0" />
              {row.original.buyPagePath}
            </span>
          ) : (
            <span className="text-xs text-primary/40">Off</span>
          ),
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        cell: ({ row }) => {
          const isCheckoutBacked = Boolean(row.original.membershipPlanId);
          const isAccountCredit = row.original.type === "ACCOUNT_CREDIT";
          const isSyncing = syncingOptionId === row.original.id;
          const hasPrimaryAction =
            Boolean(row.original.buyPagePath) ||
            (isCheckoutBacked && !isAccountCredit);

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                >
                  <span className="sr-only">Open pricing option actions</span>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">
                  Actions
                </DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link
                    href={`/studio/pricing-options/${row.original.id}`}
                    className="cursor-pointer text-xs"
                  >
                    <CreditCard className="size-3.5" /> Open details
                  </Link>
                </DropdownMenuItem>
                {hasPrimaryAction ? <DropdownMenuSeparator /> : null}
                {row.original.buyPagePath ? (
                  <DropdownMenuItem asChild>
                    <Link
                      href={row.original.buyPagePath}
                      target="_blank"
                      rel="noreferrer"
                      className="cursor-pointer text-xs"
                    >
                      <LinkIcon className="size-3.5" /> View buy page
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                {isCheckoutBacked && !isAccountCredit ? (
                  <DropdownMenuItem
                    className="cursor-pointer text-xs"
                    disabled={isSyncing || syncOption.isPending}
                    onSelect={() => handleSync(row.original.id)}
                  >
                    <RefreshCw
                      className={
                        isSyncing ? "size-3.5 animate-spin" : "size-3.5"
                      }
                    />
                    {row.original.stripePriceId
                      ? "Re-sync Stripe"
                      : "Sync Stripe"}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href={`/workflows?studioEvent=PRICING_OPTION_PURCHASED&pricingOptionId=${encodeURIComponent(row.original.id)}&resourceName=${encodeURIComponent(row.original.name)}`}
                    className="cursor-pointer text-xs"
                  >
                    <Workflow className="size-3.5" /> Create purchase automation
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-xs text-amber-600 focus:text-amber-600"
                  disabled={!row.original.isActive || archiveOption.isPending}
                  onSelect={() => setArchivingOption(row.original)}
                >
                  <Archive className="size-3.5" /> Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [archiveOption.isPending, syncOption, syncingOptionId],
  );

  React.useEffect(() => {
    setColumnOrder([...DEFAULT_COLUMN_ORDER]);
    try {
      const stored = window.localStorage.getItem(COLUMN_ORDER_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setColumnOrder(
            parsed.filter((item): item is string => typeof item === "string"),
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
          <h1 className="text-lg font-semibold text-primary">
            Pricing options
          </h1>
          <p className="text-xs text-primary/70">
            Manage memberships, class packs, bundles, checkout visibility, POS
            access, and service access.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {targetOptionId ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/studio/pricing-options">Show all options</Link>
            </Button>
          ) : null}
          <Button asChild size="sm" variant="outline">
            <Link href="/studio/pricing-options/new">
              <Plus className="size-3.5" />
              Add pricing option
            </Link>
          </Button>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <DataTable
        columns={columns}
        data={options}
        isLoading={optionsQuery.isLoading}
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
            window.localStorage.setItem(
              COLUMN_ORDER_KEY,
              JSON.stringify(order),
            );
          } catch {}
        }}
        initialColumnOrder={[...DEFAULT_COLUMN_ORDER]}
        enableGlobalSearch={false}
        toolbar={{
          filters: (ctx) => (
            <StudioTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search pricing options..."
              filterGroups={[
                {
                  label: "Status",
                  options: [
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ],
                  selectedValues: statusFilter,
                  onChange: setStatusFilter,
                },
                {
                  label: "Visibility",
                  options: [
                    { value: "public", label: "Public" },
                    { value: "hidden", label: "Hidden" },
                  ],
                  selectedValues: visibilityFilter,
                  onChange: setVisibilityFilter,
                },
                {
                  label: "Channels",
                  options: [
                    { value: "public", label: "Public" },
                    { value: "pos", label: "POS" },
                    { value: "direct", label: "Direct" },
                    { value: "hidden", label: "Hidden" },
                  ],
                  selectedValues: channelFilter,
                  onChange: setChannelFilter,
                },
                {
                  label: "Type",
                  options: PRICING_TYPES.map((type) => ({
                    value: type.value,
                    label: type.label,
                  })),
                  selectedValues: typeFilter,
                  onChange: setTypeFilter,
                },
                {
                  label: "Billing",
                  options: BILLING_INTERVALS.map((interval) => ({
                    value: interval.value,
                    label: interval.label,
                  })),
                  selectedValues: billingFilter,
                  onChange: setBillingFilter,
                },
                {
                  label: "Checkout",
                  options: [
                    { value: "direct", label: "Direct checkout" },
                    { value: "synced", label: "Synced" },
                    { value: "needs-sync", label: "Needs sync" },
                    { value: "not-backed", label: "Not checkout-backed" },
                  ],
                  selectedValues: checkoutFilter,
                  onChange: setCheckoutFilter,
                },
              ]}
              sortOptions={[
                { value: "name.asc", label: "Name A-Z" },
                { value: "name.desc", label: "Name Z-A" },
                { value: "price.asc", label: "Price low-high" },
                { value: "price.desc", label: "Price high-low" },
                { value: "type.asc", label: "Type A-Z" },
                { value: "type.desc", label: "Type Z-A" },
                { value: "access.desc", label: "Most access rules" },
                { value: "access.asc", label: "Fewest access rules" },
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
            <CreditCard className="size-8 text-primary/20" />
            <p className="text-sm text-primary/50">
              No pricing options match this view.
            </p>
          </div>
        }
      />

      <AlertDialog
        open={Boolean(archivingOption)}
        onOpenChange={(open) => !open && setArchivingOption(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this pricing option?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing purchases remain traceable, but this option will no
              longer be available for new sales.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={archiveOption.isPending}
              onClick={() => {
                if (archivingOption) {
                  archiveOption.mutate({ id: archivingOption.id });
                }
              }}
            >
              {archiveOption.isPending ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
