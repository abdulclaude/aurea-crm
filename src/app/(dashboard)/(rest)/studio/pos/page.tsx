"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ColumnDef,
  RowSelectionState,
  VisibilityState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import {
  Archive,
  CheckCircle,
  CreditCard,
  Gift,
  LinkIcon,
  MoreHorizontal,
  RefreshCw,
  ShoppingCart,
  Tag,
  User,
  X,
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  BILLING_INTERVALS,
  PRICING_TYPES,
  type BillingInterval,
  type PricingType,
} from "@/features/studio/components/pricing-options/pricing-option-create-constants";
import {
  getPricingTypeColor,
  PricingOptionCheckoutBadge,
  PricingOptionTypeBadge,
} from "@/features/studio/components/pricing-options/pricing-option-badges";
import { StudioTableToolbar } from "@/features/studio/components/studio-table-toolbar";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutput = inferRouterOutputs<AppRouter>;
type PricingOptionRow = RouterOutput["pricingOptions"]["list"][number];

type DiscountLine = {
  type: "promo" | "gift" | "accountCredit";
  code: string;
  id: string;
  amount: number;
  label: string;
};

const PRIMARY_COLUMN_ID = "item";
const COLUMN_ORDER_KEY = "pos-table.column-order.v2";
const DEFAULT_COLUMN_ORDER = [
  "select",
  "item",
  "description",
  "checkout",
  "type",
  "billing",
  "price",
  "visibility",
  "actions",
] as const;

function formatCurrency(amount: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    amount,
  );
}

function optionTypeLabel(type: PricingType): string {
  return PRICING_TYPES.find((option) => option.value === type)?.label ?? type;
}

function billingIntervalLabel(interval: BillingInterval): string {
  return (
    BILLING_INTERVALS.find((option) => option.value === interval)?.label ??
    interval
  );
}

export default function POSPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [selectedClient, setSelectedClient] = React.useState<{
    id: string;
    name: string;
    email: string | null;
  } | null>(null);
  const [clientSearch, setClientSearch] = React.useState("");
  const [clientOpen, setClientOpen] = React.useState(false);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [discounts, setDiscounts] = React.useState<DiscountLine[]>([]);
  const [codeInput, setCodeInput] = React.useState("");
  const [codeType, setCodeType] = React.useState<"promo" | "gift">("promo");
  const [checkoutUrl, setCheckoutUrl] = React.useState<string | null>(null);
  const checkoutRequestIdRef = React.useRef<string | null>(null);

  // Table state
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("name.asc");
  const [typeFilter, setTypeFilter] = React.useState<string[]>([]);
  const [billingFilter, setBillingFilter] = React.useState<string[]>([]);
  const [visibilityFilter, setVisibilityFilter] = React.useState<string[]>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [syncingOptionId, setSyncingOptionId] = React.useState<string | null>(null);
  const [archivingOption, setArchivingOption] =
    React.useState<PricingOptionRow | null>(null);

  const clientsQuery = useQuery(
    trpc.clients.list.queryOptions({
      search: clientSearch || undefined,
      limit: 10,
    }),
  );
  const pricingOptionsQuery = useQuery(
    trpc.pricingOptions.list.queryOptions({
      includeInactive: false,
      posOnly: true,
    }),
  );
  const accountCreditQuery = useQuery({
    ...trpc.studioBilling.getClientAccountCreditBalance.queryOptions({
      clientId: selectedClient?.id ?? "",
    }),
    enabled: Boolean(selectedClient),
  });

  const selectedOption = React.useMemo(() => {
    const selectedId = Object.keys(rowSelection).find(
      (key) => rowSelection[key],
    );
    return (
      (pricingOptionsQuery.data ?? []).find((p) => p.id === selectedId) ?? null
    );
  }, [pricingOptionsQuery.data, rowSelection]);

  const validatePromoQuery = useQuery(
    trpc.promoCodes.validate.queryOptions(
      {
        code: codeInput,
        planId: selectedOption?.membershipPlanId ?? undefined,
        pricingOptionId: selectedOption?.id,
      },
      { enabled: false },
    ),
  );
  const validateGiftQuery = useQuery(
    trpc.giftCards.validate.queryOptions(
      { code: codeInput },
      { enabled: false },
    ),
  );

  const checkoutMutation = useMutation(
    trpc.studioBilling.createPricingOptionCheckout.mutationOptions({
      onSuccess: (data) => {
        if (data.url) setCheckoutUrl(data.url);
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const syncOption = useMutation(
    trpc.studioBilling.syncPricingOptionWithStripe.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.pricingOptions.list.queryOptions({
            includeInactive: false,
            posOnly: true,
          }),
        );
        setSyncingOptionId(null);
        toast.success("Pricing option synced with Stripe");
      },
      onError: (error) => {
        setSyncingOptionId(null);
        toast.error(error.message);
      },
    }),
  );
  const archiveOption = useMutation(
    trpc.pricingOptions.archive.mutationOptions({
      onSuccess: async (_, variables) => {
        await queryClient.invalidateQueries(
          trpc.pricingOptions.list.queryOptions({
            includeInactive: false,
            posOnly: true,
          }),
        );
        if (rowSelection[variables.id]) {
          handleSelectionChange({});
        }
        setArchivingOption(null);
        toast.success("Pricing option archived");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const subtotal = selectedOption ? Number(selectedOption.price) : 0;
  const discountTotal = discounts.reduce((sum, d) => sum + d.amount, 0);
  const total = Math.max(0, subtotal - discountTotal);
  const orderOpen = Boolean(selectedOption);
  const canUseDiscounts = selectedOption?.type !== "ACCOUNT_CREDIT";
  const requiresMembershipCheckout = selectedOption?.type !== "ACCOUNT_CREDIT";

  const handleSelectionChange = (next: RowSelectionState) => {
    const selectedId = Object.keys(next).find((key) => next[key]);
    setRowSelection(selectedId ? { [selectedId]: true } : {});
    setDiscounts([]);
    setCheckoutUrl(null);
    checkoutRequestIdRef.current = null;
  };

  const handleSync = (optionId: string) => {
    setSyncingOptionId(optionId);
    syncOption.mutate({ pricingOptionId: optionId });
  };

  const removeSelectedOption = () => {
    setRowSelection({});
    setDiscounts([]);
    setCheckoutUrl(null);
    checkoutRequestIdRef.current = null;
  };

  const applyAccountCredit = () => {
    if (!selectedClient || !selectedOption || !canUseDiscounts) return;

    const available = accountCreditQuery.data?.balance ?? 0;
    if (available <= 0) {
      toast.error("No account credit available");
      return;
    }

    const discountsWithoutAccountCredit = discounts.filter(
      (discount) => discount.type !== "accountCredit",
    );
    const amountBeforeAccountCredit = Math.max(
      0,
      subtotal -
        discountsWithoutAccountCredit.reduce(
          (sum, discount) => sum + discount.amount,
          0,
        ),
    );
    const amount = Math.min(available, amountBeforeAccountCredit);
    if (amount <= 0) {
      toast.error("Order is already fully discounted");
      return;
    }

    setDiscounts([
      ...discountsWithoutAccountCredit,
      {
        type: "accountCredit",
        code: "ACCOUNT_CREDIT",
        id: accountCreditQuery.data?.id ?? selectedClient.id,
        amount,
        label: "Account credit",
      },
    ]);
    toast.success("Account credit applied");
  };

  const applyCode = async () => {
    if (!codeInput.trim() || !selectedOption || !canUseDiscounts) return;

    if (codeType === "promo") {
      const result = await validatePromoQuery.refetch();
      const data = result.data;
      if (!data?.valid) {
        toast.error(data?.reason ?? "Invalid promo code");
        return;
      }
      const amount =
        data.promoCode.discountType === "PERCENT"
          ? (subtotal * data.promoCode.discountValue) / 100
          : data.promoCode.discountValue;
      const cappedAmount = Math.min(amount, subtotal);
      setDiscounts((cur) => [
        ...cur.filter((d) => d.type !== "promo"),
        {
          type: "promo",
          code: data.promoCode.code,
          id: data.promoCode.id,
          amount: cappedAmount,
          label: `Promo: ${data.promoCode.code}`,
        },
      ]);
      setCodeInput("");
      toast.success("Promo code applied");
      return;
    }

    const result = await validateGiftQuery.refetch();
    const data = result.data;
    if (!data?.valid) {
      toast.error(data?.reason ?? "Invalid gift card");
      return;
    }
    const amount = Math.min(data.card.remainingBalance, total);
    setDiscounts((cur) => [
      ...cur.filter((d) => d.code !== data.card.code),
      {
        type: "gift",
        code: data.card.code,
        id: data.card.id,
        amount,
        label: `Gift: ${data.card.code}`,
      },
    ]);
    setCodeInput("");
    toast.success("Gift card applied");
  };

  const handleCheckout = () => {
    if (!selectedClient || !selectedOption) return;
    const promoCode = discounts.find((d) => d.type === "promo")?.code;
    const giftCardCode = discounts.find((d) => d.type === "gift")?.code;
    const accountCreditAmount = discounts.find(
      (d) => d.type === "accountCredit",
    )?.amount;
    checkoutMutation.mutate({
      checkoutRequestId:
        checkoutRequestIdRef.current ??
        (checkoutRequestIdRef.current = crypto.randomUUID()),
      pricingOptionId: selectedOption.id,
      clientId: selectedClient.id,
      successUrl: `${window.location.origin}/studio/pos?success=1`,
      cancelUrl: `${window.location.origin}/studio/pos`,
      promoCode,
      giftCardCode,
      accountCreditAmount,
    });
  };

  const filteredOptions = React.useMemo(() => {
    let result = pricingOptionsQuery.data ?? [];
    if (typeFilter.length > 0)
      result = result.filter((p) => typeFilter.includes(p.type));
    if (billingFilter.length > 0)
      result = result.filter((p) => billingFilter.includes(p.billingInterval));
    if (visibilityFilter.length > 0)
      result = result.filter((p) =>
        visibilityFilter.includes(p.isPublic ? "public" : "hidden"),
      );
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q),
      );
    }
    const [col, dir] = sort.split(".");
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (col === "name") cmp = a.name.localeCompare(b.name);
      else if (col === "price") cmp = Number(a.price) - Number(b.price);
      return dir === "desc" ? -cmp : cmp;
    });
    return result;
  }, [
    pricingOptionsQuery.data,
    search,
    sort,
    typeFilter,
    billingFilter,
    visibilityFilter,
  ]);

  const columns = React.useMemo<ColumnDef<PricingOptionRow>[]>(
    () => [
      {
        id: "select",
        enableHiding: false,
        header: () => null,
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(checked) =>
              handleSelectionChange(checked ? { [row.original.id]: true } : {})
            }
            aria-label={`Select ${row.original.name}`}
          />
        ),
      },
      {
        id: "item",
        accessorKey: "name",
        header: "Item",
        meta: { label: "Item" },
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
            <span className="text-xs font-medium text-primary">
              {row.original.name}
            </span>
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
        id: "type",
        accessorKey: "type",
        header: "Type",
        meta: { label: "Type" },
        cell: ({ row }) => (
          <PricingOptionTypeBadge type={row.original.type as PricingType} />
        ),
      },
      {
        id: "billing",
        accessorKey: "billingInterval",
        header: "Billing",
        meta: { label: "Billing" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/50">
            {billingIntervalLabel(
              row.original.billingInterval as BillingInterval,
            )}
          </span>
        ),
      },
      {
        id: "price",
        accessorFn: (row) => Number(row.price),
        header: "Price",
        meta: { label: "Price" },
        cell: ({ row }) => (
          <span className="text-xs font-medium">
            {formatCurrency(Number(row.original.price), row.original.currency)}
          </span>
        ),
      },
      {
        id: "visibility",
        accessorFn: (row) => (row.isPublic ? "Public" : "Hidden"),
        header: "Visibility",
        meta: { label: "Visibility" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/50">
            {row.original.isPublic ? "Public" : "Hidden"}
          </span>
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
                <Button type="button" variant="ghost" size="icon" className="size-8">
                  <span className="sr-only">Open pricing option actions</span>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
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
                      className={isSyncing ? "size-3.5 animate-spin" : "size-3.5"}
                    />
                    {row.original.stripePriceId ? "Re-sync Stripe" : "Sync Stripe"}
                  </DropdownMenuItem>
                ) : null}
                {hasPrimaryAction ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem
                  className="cursor-pointer text-xs text-amber-600 focus:text-amber-600"
                  disabled={archiveOption.isPending}
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

  const columnOrderFinal =
    columnOrder.length > 0 ? columnOrder : [...DEFAULT_COLUMN_ORDER];

  if (checkoutUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
        <div className="space-y-2 text-center">
          <CreditCard className="mx-auto size-12 text-primary" />
          <h2 className="text-xl font-semibold">Payment link ready</h2>
          <p className="text-sm text-primary/60">
            Share this link with the member or open it on a card reader device.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => window.open(checkoutUrl, "_blank")}>
            Open payment page
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setCheckoutUrl(null);
              removeSelectedOption();
              setSelectedClient(null);
            }}
          >
            New sale
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-wrap items-end justify-between gap-4 p-6">
          <div>
            <h1 className="text-lg font-semibold text-primary">
              Point of sale
            </h1>
            <p className="text-xs text-primary/70">
              Sell a pricing option for a selected member through Stripe
              checkout.
            </p>
          </div>
          <Popover open={clientOpen} onOpenChange={setClientOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="min-w-64 justify-start text-left font-normal"
              >
                <User className="mr-2 size-4 shrink-0" />
                {selectedClient ? (
                  <span className="truncate">{selectedClient.name}</span>
                ) : (
                  <span className="text-primary/40">Search for a member</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <Command>
                <CommandInput
                  placeholder="Search by name or email"
                  value={clientSearch}
                  onValueChange={setClientSearch}
                />
                <CommandList>
                  <CommandEmpty>No members found.</CommandEmpty>
                  <CommandGroup>
                    {clientsQuery.data?.items.map((client) => (
                      <CommandItem
                        key={client.id}
                        onSelect={() => {
                          setSelectedClient({
                            id: client.id,
                            name: client.name,
                            email: client.email ?? null,
                          });
                          setDiscounts([]);
                          setClientOpen(false);
                          setClientSearch("");
                        }}
                      >
                        <User className="mr-2 size-4 text-primary/40" />
                        <div>
                          <p className="text-sm font-medium">{client.name}</p>
                          {client.email && (
                            <p className="text-xs text-primary/40">
                              {client.email}
                            </p>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <Separator className="bg-black/5 dark:bg-white/5" />

        <DataTable
          columns={columns}
          data={filteredOptions}
          isLoading={pricingOptionsQuery.isLoading}
          enableRowSelection
          rowSelection={rowSelection}
          onRowSelectionChange={handleSelectionChange}
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
                    label: "Type",
                    options: PRICING_TYPES.map((option) => ({
                      value: option.value,
                      label: option.label,
                    })),
                    selectedValues: typeFilter,
                    onChange: setTypeFilter,
                  },
                  {
                    label: "Billing",
                    options: BILLING_INTERVALS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    })),
                    selectedValues: billingFilter,
                    onChange: setBillingFilter,
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
                ]}
                sortOptions={[
                  { value: "name.asc", label: "Name A–Z" },
                  { value: "name.desc", label: "Name Z–A" },
                  { value: "price.asc", label: "Price low–high" },
                  { value: "price.desc", label: "Price high–low" },
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
                initialColumnOrder={[...DEFAULT_COLUMN_ORDER]}
                primaryColumnId={PRIMARY_COLUMN_ID}
              />
            ),
          }}
          emptyState={
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <ShoppingCart className="size-8 text-primary/20" />
              <p className="text-sm text-primary/50">
                No sellable pricing options found.
              </p>
            </div>
          }
        />
      </div>

      {/* Order sidebar — only visible when a pricing option is selected */}
      {orderOpen && (
        <aside className="flex w-96 shrink-0 flex-col border-l border-black/5 bg-background dark:border-white/5">
          <div className="border-b border-black/5 p-4 dark:border-white/5">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-4" />
              <h2 className="text-sm font-semibold">Order</h2>
            </div>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{selectedOption!.name}</p>
                <p className="text-xs text-primary/50">
                  {optionTypeLabel(selectedOption!.type as PricingType)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {formatCurrency(
                    Number(selectedOption!.price),
                    selectedOption!.currency,
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={removeSelectedOption}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>

            {discounts.map((d) => (
              <div
                key={d.code}
                className="flex items-center justify-between text-sm text-emerald-500"
              >
                <div className="flex items-center gap-1.5">
                  {d.type === "promo" ? (
                    <Tag className="size-3.5" />
                  ) : d.type === "gift" ? (
                    <Gift className="size-3.5" />
                  ) : (
                    <CreditCard className="size-3.5" />
                  )}
                  <span>{d.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>-{formatCurrency(d.amount)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() =>
                      setDiscounts((cur) =>
                        cur.filter((item) => item.code !== d.code),
                      )
                    }
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}

            {canUseDiscounts ? (
              <div className="space-y-3 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs">Discount</Label>
                  <div className="grid grid-cols-[120px_1fr_auto] gap-2">
                    <Select
                      value={codeType}
                      onValueChange={(v) => setCodeType(v as "promo" | "gift")}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="promo">Promo</SelectItem>
                        <SelectItem value="gift">Gift card</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      className="h-8 text-xs"
                      placeholder={
                        codeType === "promo" ? "Promo code" : "Gift card code"
                      }
                      value={codeInput}
                      onChange={(event) =>
                        setCodeInput(event.target.value.toUpperCase())
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void applyCode();
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={applyCode}
                    >
                      Apply
                    </Button>
                  </div>
                </div>

                {selectedClient && (
                  <div className="flex items-center justify-between rounded-sm border border-black/10 p-3 dark:border-white/5">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-primary">
                        Account credit
                      </p>
                      <p className="text-[11px] text-primary/50">
                        Available:{" "}
                        {formatCurrency(
                          accountCreditQuery.data?.balance ?? 0,
                          accountCreditQuery.data?.currency ?? "GBP",
                        )}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={(accountCreditQuery.data?.balance ?? 0) <= 0}
                      onClick={applyAccountCredit}
                    >
                      Apply
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="rounded-sm border border-black/10 p-3 text-xs text-primary/50 dark:border-white/5">
                Account credit top-ups cannot be discounted.
              </p>
            )}
          </div>

          <div className="space-y-3 border-t border-black/5 p-4 dark:border-white/5">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-primary/50">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-emerald-500">
                  <span>Discounts</span>
                  <span>-{formatCurrency(discountTotal)}</span>
                </div>
              )}
              <Separator className="my-2 opacity-30" />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <Button
              className="w-full"
              disabled={
                !selectedClient ||
                !selectedOption ||
                checkoutMutation.isPending ||
                (requiresMembershipCheckout &&
                  (!selectedOption!.membershipPlanId ||
                    !selectedOption!.stripePriceId))
              }
              onClick={handleCheckout}
            >
              <CreditCard className="mr-2 size-4" />
              {checkoutMutation.isPending
                ? "Creating link..."
                : "Charge via Stripe"}
            </Button>

            {!selectedClient && (
              <p className="text-center text-xs text-amber-500">
                Select a member to proceed.
              </p>
            )}
            {selectedOption &&
              requiresMembershipCheckout &&
              !selectedOption.membershipPlanId && (
              <p className="text-center text-xs text-amber-500">
                Link this pricing option to a checkout-backed membership plan
                before checkout.
              </p>
            )}
            {selectedOption &&
              requiresMembershipCheckout &&
              selectedOption.membershipPlanId &&
              !selectedOption.stripePriceId && (
              <p className="text-center text-xs text-amber-500">
                Sync the linked membership plan with Stripe before checkout.
              </p>
            )}
            {checkoutUrl && (
              <div className="flex items-center justify-center gap-1 text-xs text-emerald-500">
                <CheckCircle className="size-3" />
                Payment link created.
              </div>
            )}
          </div>
        </aside>
      )}

      <AlertDialog
        open={Boolean(archivingOption)}
        onOpenChange={(open) => !open && setArchivingOption(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this pricing option?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing purchases remain traceable, but this option will no longer
              be available in point of sale or for new purchases.
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
