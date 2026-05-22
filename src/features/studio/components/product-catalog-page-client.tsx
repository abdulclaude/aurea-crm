"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { Package, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { StudioTableToolbar } from "@/features/studio/components/studio-table-toolbar";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";

type RouterOutput = inferRouterOutputs<AppRouter>;
type ProductRow = RouterOutput["productCatalog"]["list"][number];
type ProductType =
  | "MEMBERSHIP_PLAN"
  | "CLASS_PACK"
  | "RETAIL"
  | "FEE"
  | "ACCOUNT_CREDIT"
  | "SHIPPING"
  | "TIP"
  | "EXTERNAL_REVENUE"
  | "GIFT_CARD"
  | "OTHER";

const PRODUCT_TYPES: Array<{ value: ProductType; label: string }> = [
  { value: "MEMBERSHIP_PLAN", label: "Membership plan" },
  { value: "CLASS_PACK", label: "Class pack" },
  { value: "RETAIL", label: "Retail" },
  { value: "FEE", label: "Fee" },
  { value: "ACCOUNT_CREDIT", label: "Payment on account" },
  { value: "SHIPPING", label: "Shipping & handling" },
  { value: "TIP", label: "Tip" },
  { value: "EXTERNAL_REVENUE", label: "External revenue" },
  { value: "GIFT_CARD", label: "Gift card" },
  { value: "OTHER", label: "Other" },
];

const EMPTY_FORM = {
  name: "",
  description: "",
  type: "OTHER" as ProductType,
  category: "",
  sku: "",
  externalId: "",
  price: "0",
  cost: "",
  currency: "GBP",
  taxRate: "",
  trackInventory: false,
  stockQuantity: "",
  lowStockThreshold: "",
  isPublic: true,
  isActive: true,
};

type ProductFormState = typeof EMPTY_FORM;

function formatMoney(value: unknown, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(Number(value ?? 0));
}

function toNumberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPayload(form: ProductFormState) {
  return {
    name: form.name,
    description: form.description || null,
    type: form.type,
    category: form.category || null,
    sku: form.sku || null,
    externalId: form.externalId || null,
    price: Number(form.price || 0),
    cost: toNumberOrNull(form.cost),
    currency: form.currency.toUpperCase(),
    taxRate: toNumberOrNull(form.taxRate),
    trackInventory: form.trackInventory,
    stockQuantity: toNumberOrNull(form.stockQuantity),
    lowStockThreshold: toNumberOrNull(form.lowStockThreshold),
    isPublic: form.isPublic,
    isActive: form.isActive,
  };
}

function typeLabel(type: string): string {
  return PRODUCT_TYPES.find((item) => item.value === type)?.label ?? type;
}

function statusBadge(product: ProductRow) {
  return product.isActive ? (
    <Badge
      variant="outline"
      className="text-[11px] text-emerald-600 ring-emerald-300 bg-emerald-50 dark:border-emerald-800"
    >
      Active
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="text-[11px] text-rose-600 bg-rose-50 ring-rose-200 dark:border-rose-800"
    >
      Inactive
    </Badge>
  );
}

const PRIMARY_COLUMN_ID = "name";
const COLUMN_ORDER_KEY = "product-catalog.column-order";

function buildProductColumns({
  onEdit,
  onArchive,
  isArchiving,
}: {
  onEdit: (product: ProductRow) => void;
  onArchive: (id: string) => void;
  isArchiving: boolean;
}): ColumnDef<ProductRow>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      meta: { label: "Name" },
      enableHiding: false,
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-left text-xs font-medium"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(row.original);
            }}
          >
            {row.original.name}
          </Button>
          <p className="text-[11px] text-primary/45">
            {row.original.sku || row.original.externalId || "No SKU"}
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
        <span className="text-xs text-primary/65">
          {typeLabel(row.original.type)}
        </span>
      ),
    },
    {
      id: "category",
      accessorKey: "category",
      header: "Category",
      meta: { label: "Category" },
      cell: ({ row }) => (
        <span className="text-xs text-primary/55">
          {row.original.category ?? "Uncategorised"}
        </span>
      ),
    },
    {
      id: "price",
      accessorFn: (row) => Number(row.price ?? 0),
      header: "Price",
      meta: { label: "Price" },
      cell: ({ row }) => (
        <span className="text-xs font-medium text-primary">
          {formatMoney(row.original.price, row.original.currency)}
        </span>
      ),
    },
    {
      id: "inventory",
      accessorFn: (row) => row.stockQuantity ?? 0,
      header: "Inventory",
      meta: { label: "Inventory" },
      cell: ({ row }) => (
        <span className="text-xs text-primary/55">
          {row.original.trackInventory
            ? `${row.original.stockQuantity ?? 0} in stock`
            : "Not tracked"}
        </span>
      ),
    },
    {
      id: "status",
      accessorFn: (row) => row.isActive,
      header: "Status",
      meta: { label: "Status" },
      cell: ({ row }) => statusBadge(row.original),
    },
    {
      id: "actions",
      header: "",
      meta: { label: "Actions" },
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          disabled={isArchiving}
          onClick={(event) => {
            event.stopPropagation();
            onArchive(row.original.id);
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      ),
    },
  ];
}

export function ProductCatalogPageClient() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [sortValue, setSortValue] = React.useState("name.asc");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<ProductRow | null>(
    null,
  );
  const [form, setForm] = React.useState<ProductFormState>(EMPTY_FORM);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);

  const productsQuery = useQuery(
    trpc.productCatalog.list.queryOptions({
      search: search || undefined,
      includeInactive: true,
    }),
  );

  const invalidateCatalog = () =>
    queryClient.invalidateQueries(trpc.productCatalog.list.queryOptions());

  const createMutation = useMutation(
    trpc.productCatalog.create.mutationOptions({
      onSuccess: async () => {
        await invalidateCatalog();
        toast.success("Product created");
        closeDialog();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.productCatalog.update.mutationOptions({
      onSuccess: async () => {
        await invalidateCatalog();
        toast.success("Product updated");
        closeDialog();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const archiveMutation = useMutation(
    trpc.productCatalog.archive.mutationOptions({
      onSuccess: async () => {
        await invalidateCatalog();
        toast.success("Product archived");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function closeDialog() {
    setDialogOpen(false);
    setEditingProduct(null);
    setForm(EMPTY_FORM);
  }

  function openCreateDialog() {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(product: ProductRow) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description ?? "",
      type: product.type,
      category: product.category ?? "",
      sku: product.sku ?? "",
      externalId: product.externalId ?? "",
      price: String(product.price ?? "0"),
      cost: product.cost ? String(product.cost) : "",
      currency: product.currency,
      taxRate: product.taxRate ? String(product.taxRate) : "",
      trackInventory: product.trackInventory,
      stockQuantity: product.stockQuantity ? String(product.stockQuantity) : "",
      lowStockThreshold: product.lowStockThreshold
        ? String(product.lowStockThreshold)
        : "",
      isPublic: product.isPublic,
      isActive: product.isActive,
    });
    setDialogOpen(true);
  }

  async function submitProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingProduct) {
      await updateMutation.mutateAsync({
        id: editingProduct.id,
        ...toPayload(form),
      });
      return;
    }
    await createMutation.mutateAsync(toPayload(form));
  }

  const allProducts = productsQuery.data ?? [];

  const filteredProducts = React.useMemo(() => {
    let result = allProducts;
    if (typeFilter.length > 0)
      result = result.filter((p) => typeFilter.includes(p.type));
    if (statusFilter.length > 0) {
      result = result.filter((p) => {
        if (statusFilter.includes("ACTIVE") && p.isActive) return true;
        if (statusFilter.includes("INACTIVE") && !p.isActive) return true;
        return false;
      });
    }
    const [col, dir] = sortValue.split(".");
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (col === "name") cmp = a.name.localeCompare(b.name);
      else if (col === "price")
        cmp = Number(a.price ?? 0) - Number(b.price ?? 0);
      else if (col === "type") cmp = a.type.localeCompare(b.type);
      return dir === "desc" ? -cmp : cmp;
    });
    return result;
  }, [allProducts, typeFilter, statusFilter, sortValue]);

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const columns = React.useMemo(
    () =>
      buildProductColumns({
        onEdit: openEditDialog,
        onArchive: (id) => archiveMutation.mutate({ id }),
        isArchiving: archiveMutation.isPending,
      }),
    [archiveMutation],
  );

  const COLUMN_IDS = columns.map((c, i) => c.id ?? `col-${i}`);
  const columnOrderFinal = columnOrder.length > 0 ? columnOrder : COLUMN_IDS;

  return (
    <div className="space-y-0">
      <div className="flex items-end justify-between gap-4 p-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">
            Product catalog
          </h1>
          <p className="text-xs text-primary/70">
            Manage retail items, fees, account credits, and service products.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={openCreateDialog}>
          <Plus className="size-3.5" />
          Add product
        </Button>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <DataTable
        columns={columns}
        data={filteredProducts}
        isLoading={productsQuery.isLoading}
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
        onRowClick={openEditDialog}
        toolbar={{
          filters: (ctx) => (
            <StudioTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search products..."
              filterGroups={[
                {
                  label: "Type",
                  options: PRODUCT_TYPES.map((t) => ({
                    value: t.value,
                    label: t.label,
                  })),
                  selectedValues: typeFilter,
                  onChange: setTypeFilter,
                },
                {
                  label: "Status",
                  options: [
                    { value: "ACTIVE", label: "Active" },
                    { value: "INACTIVE", label: "Inactive" },
                  ],
                  selectedValues: statusFilter,
                  onChange: setStatusFilter,
                },
              ]}
              sortOptions={[
                { value: "name.asc", label: "Name A–Z" },
                { value: "name.desc", label: "Name Z–A" },
                { value: "price.desc", label: "Price high–low" },
                { value: "price.asc", label: "Price low–high" },
                { value: "type.asc", label: "Type A–Z" },
              ]}
              sortValue={sortValue}
              onSortChange={setSortValue}
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
            <Package className="mb-3 size-8 text-primary/20" />
            <p className="text-sm text-primary/50">No products found.</p>
          </div>
        }
      />

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit product" : "Add product"}
            </DialogTitle>
          </DialogHeader>
          <form className="space-y-5" onSubmit={submitProduct}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, type: value as ProductType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      category: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input
                  value={form.sku}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, sku: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>External ID</Label>
                <Input
                  value={form.externalId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      externalId: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Price</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, price: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Cost</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, cost: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input
                  value={form.currency}
                  maxLength={3}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      currency: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tax rate</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.taxRate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      taxRate: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-3">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.trackInventory}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, trackInventory: checked }))
                  }
                />
                Track inventory
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.isPublic}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, isPublic: checked }))
                  }
                />
                Public
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, isActive: checked }))
                  }
                />
                Active
              </label>
              {form.trackInventory ? (
                <>
                  <div className="space-y-2">
                    <Label>Stock quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.stockQuantity}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          stockQuantity: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Low stock threshold</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.lowStockThreshold}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          lowStockThreshold: event.target.value,
                        }))
                      }
                    />
                  </div>
                </>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {editingProduct ? "Save changes" : "Create product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
