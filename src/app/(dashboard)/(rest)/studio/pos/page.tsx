"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnOrderState,
  RowSelectionState,
  VisibilityState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import {
  CheckCircle,
  CreditCard,
  Gift,
  ShoppingCart,
  Tag,
  User,
  X,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
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
import { StudioTableToolbar } from "@/features/studio/components/studio-table-toolbar";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutput = inferRouterOutputs<AppRouter>;
type PlanRow = RouterOutput["membershipPlans"]["list"][number];

type DiscountLine = {
  type: "promo" | "gift";
  code: string;
  id: string;
  amount: number;
  label: string;
};

const PRIMARY_COLUMN_ID = "item";
const COLUMN_ORDER_KEY = "pos-table.column-order";

function formatCurrency(amount: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    amount,
  );
}

function planTypeLabel(type: string): string {
  return type.replaceAll("_", " ").toLowerCase();
}

export default function POSPage() {
  const trpc = useTRPC();

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

  // Table state
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("name.asc");
  const [typeFilter, setTypeFilter] = React.useState<string[]>([]);
  const [billingFilter, setBillingFilter] = React.useState<string[]>([]);
  const [visibilityFilter, setVisibilityFilter] = React.useState<string[]>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);

  const clientsQuery = useQuery(
    trpc.clients.list.queryOptions({
      search: clientSearch || undefined,
      limit: 10,
    }),
  );
  const plansQuery = useQuery(
    trpc.membershipPlans.list.queryOptions({ includeInactive: false }),
  );

  const selectedPlan = React.useMemo(() => {
    const selectedId = Object.keys(rowSelection).find(
      (key) => rowSelection[key],
    );
    return (plansQuery.data ?? []).find((p) => p.id === selectedId) ?? null;
  }, [plansQuery.data, rowSelection]);

  const validatePromoQuery = useQuery(
    trpc.promoCodes.validate.queryOptions(
      { code: codeInput, planId: selectedPlan?.id },
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
    trpc.studioBilling.createMembershipCheckout.mutationOptions({
      onSuccess: (data) => {
        if (data.url) setCheckoutUrl(data.url);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const subtotal = selectedPlan ? Number(selectedPlan.price) : 0;
  const discountTotal = discounts.reduce((sum, d) => sum + d.amount, 0);
  const total = Math.max(0, subtotal - discountTotal);
  const orderOpen = Boolean(selectedPlan);

  const handleSelectionChange = (next: RowSelectionState) => {
    const selectedId = Object.keys(next).find((key) => next[key]);
    setRowSelection(selectedId ? { [selectedId]: true } : {});
    setDiscounts([]);
  };

  const removeSelectedPlan = () => {
    setRowSelection({});
    setDiscounts([]);
  };

  const applyCode = async () => {
    if (!codeInput.trim() || !selectedPlan) return;

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
      setDiscounts((cur) => [
        ...cur.filter((d) => d.type !== "promo"),
        {
          type: "promo",
          code: data.promoCode.code,
          id: data.promoCode.id,
          amount,
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
    if (!selectedClient || !selectedPlan) return;
    const promoCode = discounts.find((d) => d.type === "promo")?.code;
    checkoutMutation.mutate({
      planId: selectedPlan.id,
      clientId: selectedClient.id,
      successUrl: `${window.location.origin}/studio/pos?success=1`,
      cancelUrl: `${window.location.origin}/studio/pos`,
      promoCode,
    });
  };

  const filteredPlans = React.useMemo(() => {
    let result = plansQuery.data ?? [];
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
    plansQuery.data,
    search,
    sort,
    typeFilter,
    billingFilter,
    visibilityFilter,
  ]);

  const columns = React.useMemo<ColumnDef<PlanRow>[]>(
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
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-primary">
                {row.original.name}
              </span>
              {!row.original.stripePriceId && (
                <Badge
                  variant="outline"
                  className="border-amber-500/40 text-amber-500 text-[10px]"
                >
                  Stripe sync needed
                </Badge>
              )}
            </div>
            <p className="max-w-sm truncate text-[11px] text-primary/40">
              {row.original.description ?? "Membership checkout item"}
            </p>
          </div>
        ),
      },
      {
        id: "type",
        accessorKey: "type",
        header: "Type",
        meta: { label: "Type" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/50">
            {planTypeLabel(row.original.type)}
          </span>
        ),
      },
      {
        id: "billing",
        accessorKey: "billingInterval",
        header: "Billing",
        meta: { label: "Billing" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/50">
            {planTypeLabel(row.original.billingInterval)}
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
    ],
    [],
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

  const columnOrderFinal = columnOrder.length > 0 ? columnOrder : COLUMN_IDS;

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
              removeSelectedPlan();
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
              Sell a membership plan for a selected member through Stripe
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
          data={filteredPlans}
          isLoading={plansQuery.isLoading}
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
          initialColumnOrder={COLUMN_IDS}
          enableGlobalSearch={false}
          toolbar={{
            filters: (ctx) => (
              <StudioTableToolbar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search plans..."
                filterGroups={[
                  {
                    label: "Type",
                    options: [
                      { value: "UNLIMITED", label: "Unlimited" },
                      { value: "CLASS_PACK", label: "Class pack" },
                      { value: "DROP_IN", label: "Drop-in" },
                      { value: "TIME_BASED", label: "Time-based" },
                      { value: "TIERED", label: "Tiered" },
                      { value: "INTRO_OFFER", label: "Intro offer" },
                      { value: "TRIAL", label: "Trial" },
                    ],
                    selectedValues: typeFilter,
                    onChange: setTypeFilter,
                  },
                  {
                    label: "Billing",
                    options: [
                      { value: "WEEKLY", label: "Weekly" },
                      { value: "MONTHLY", label: "Monthly" },
                      { value: "QUARTERLY", label: "Quarterly" },
                      { value: "ANNUALLY", label: "Annually" },
                      { value: "ONE_TIME", label: "One-time" },
                    ],
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
                initialColumnOrder={COLUMN_IDS}
                primaryColumnId={PRIMARY_COLUMN_ID}
              />
            ),
          }}
          emptyState={
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="mb-3 size-8 text-primary" />
              <p className="text-sm text-primary/50">
                No sellable plans found.
              </p>
            </div>
          }
        />
      </div>

      {/* Order sidebar — only visible when a plan is selected */}
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
                <p className="font-medium">{selectedPlan!.name}</p>
                <p className="text-xs text-primary/50">
                  {planTypeLabel(selectedPlan!.type)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {formatCurrency(
                    Number(selectedPlan!.price),
                    selectedPlan!.currency,
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={removeSelectedPlan}
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
                  ) : (
                    <Gift className="size-3.5" />
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

            <div className="space-y-2 pt-2">
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
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void applyCode();
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
                !selectedPlan ||
                checkoutMutation.isPending ||
                !selectedPlan!.stripePriceId
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
            {selectedPlan && !selectedPlan.stripePriceId && (
              <p className="text-center text-xs text-amber-500">
                Sync this plan with Stripe before checkout.
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
    </div>
  );
}
