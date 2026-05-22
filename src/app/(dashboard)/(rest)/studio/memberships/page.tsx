"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnOrderState,
  VisibilityState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { Archive, CreditCard, Pencil, Plus, Users } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTabs } from "@/components/ui/page-tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { StudioTableToolbar } from "@/features/studio/components/studio-table-toolbar";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";

const PLAN_TYPES = [
  { value: "UNLIMITED", label: "Unlimited" },
  { value: "CLASS_PACK", label: "Class pack" },
  { value: "DROP_IN", label: "Drop-in" },
  { value: "TIME_BASED", label: "Time-based" },
  { value: "TIERED", label: "Tiered" },
  { value: "INTRO_OFFER", label: "Intro offer" },
  { value: "TRIAL", label: "Trial" },
] as const;

const BILLING_INTERVALS = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUALLY", label: "Annually" },
  { value: "ONE_TIME", label: "One-time" },
] as const;

const pageTabs = [
  { id: "members", label: "Active members" },
  { id: "plans", label: "Current plans" },
];

const PLANS_PRIMARY = "name";
const MEMBERS_PRIMARY = "member";
const PLANS_ORDER_KEY = "memberships-plans.column-order";
const MEMBERS_ORDER_KEY = "memberships-members.column-order";

type PlanType = (typeof PLAN_TYPES)[number]["value"];
type BillingInterval = (typeof BILLING_INTERVALS)[number]["value"];
type RouterOutput = inferRouterOutputs<AppRouter>;
type PlanRow = RouterOutput["membershipPlans"]["list"][number];
type MemberRow = RouterOutput["subscriptions"]["list"][number];

function money(value: unknown, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    Number(value ?? 0),
  );
}

function planTypeLabel(value: string): string {
  return PLAN_TYPES.find((t) => t.value === value)?.label ?? value;
}

function intervalLabel(value: string): string {
  return BILLING_INTERVALS.find((i) => i.value === value)?.label ?? value;
}

function memberStatusTone(status: string): string {
  if (status === "ACTIVE") return "text-teal-600 ring-teal-300 bg-teal-100 dark:border-teal-800";
  if (status === "PAUSED") return "text-amber-600 ring-amber-300 bg-amber-100 dark:border-amber-800";
  if (status === "CANCELLED") return "text-rose-600 ring-rose-300 bg-rose-100 dark:border-rose-800";
  if (status === "EXPIRED") return "text-gray-600 ring-gray-300 bg-gray-100 dark:border-gray-700";
  return "text-sky-600 ring-sky-300 bg-sky-100 dark:border-sky-800";
}

function PlanForm({
  onSubmit,
  isPending,
  initial,
  submitLabel,
}: {
  onSubmit: (data: {
    name: string;
    description?: string;
    type: PlanType;
    price: number;
    billingInterval: BillingInterval;
    classCredits?: number;
    durationDays?: number;
    isPublic: boolean;
  }) => void;
  isPending: boolean;
  initial?: PlanRow;
  submitLabel: string;
}) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [description, setDescription] = React.useState(
    initial?.description ?? "",
  );
  const [type, setType] = React.useState<PlanType>(
    (initial?.type as PlanType) ?? "UNLIMITED",
  );
  const [price, setPrice] = React.useState(
    initial ? Number(initial.price).toString() : "",
  );
  const [interval, setInterval] = React.useState<BillingInterval>(
    (initial?.billingInterval as BillingInterval) ?? "MONTHLY",
  );
  const [credits, setCredits] = React.useState(
    initial?.classCredits?.toString() ?? "",
  );
  const [duration, setDuration] = React.useState(
    initial?.durationDays?.toString() ?? "",
  );
  const [isPublic, setIsPublic] = React.useState(initial?.isPublic ?? true);

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label className="text-xs">Plan name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Unlimited Monthly"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Description</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as PlanType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAN_TYPES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Billing</Label>
          <Select
            value={interval}
            onValueChange={(v) => setInterval(v as BillingInterval)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BILLING_INTERVALS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label className="text-xs">Price</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="149.00"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Credits</Label>
          <Input
            type="number"
            min="1"
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
            placeholder="10"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Duration days</Label>
          <Input
            type="number"
            min="1"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="30"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="plan-is-public"
          checked={isPublic}
          onCheckedChange={(c) => setIsPublic(c === true)}
        />
        <Label htmlFor="plan-is-public" className="text-xs">
          Visible to members
        </Label>
      </div>
      <Button
        type="button"
        onClick={() =>
          onSubmit({
            name: name.trim(),
            description: description.trim() || undefined,
            type,
            price: Number(price) || 0,
            billingInterval: interval,
            classCredits: credits ? Number.parseInt(credits, 10) : undefined,
            durationDays: duration ? Number.parseInt(duration, 10) : undefined,
            isPublic,
          })
        }
        disabled={!name.trim() || !price || isPending}
        className="w-full"
      >
        {isPending ? "Saving..." : submitLabel}
      </Button>
    </div>
  );
}

export default function MembershipsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("members");
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<PlanRow | null>(null);

  // Plans tab state
  const [plansSearch, setPlansSearch] = React.useState("");
  const [plansSort, setPlansSort] = React.useState("name.asc");
  const [plansStatusFilter, setPlansStatusFilter] = React.useState<string[]>(
    [],
  );
  const [plansVisibilityFilter, setPlansVisibilityFilter] = React.useState<
    string[]
  >([]);
  const [plansTypeFilter, setPlansTypeFilter] = React.useState<string[]>([]);
  const [plansBillingFilter, setPlansBillingFilter] = React.useState<string[]>(
    [],
  );
  const [plansColumnVisibility, setPlansColumnVisibility] =
    React.useState<VisibilityState>({});
  const [plansColumnOrder, setPlansColumnOrder] = React.useState<string[]>([]);

  // Members tab state
  const [membersSearch, setMembersSearch] = React.useState("");
  const [membersSort, setMembersSort] = React.useState("name.asc");
  const [membersStatusFilter, setMembersStatusFilter] = React.useState<
    string[]
  >([]);
  const [membersColumnVisibility, setMembersColumnVisibility] =
    React.useState<VisibilityState>({});
  const [membersColumnOrder, setMembersColumnOrder] = React.useState<string[]>(
    [],
  );

  const plansQuery = useQuery(
    trpc.membershipPlans.list.queryOptions({ includeInactive: true }),
  );
  const membersQuery = useQuery(
    trpc.subscriptions.list.queryOptions({
      status:
        membersStatusFilter.length === 1
          ? (membersStatusFilter[0] as
              | "ACTIVE"
              | "PAUSED"
              | "CANCELLED"
              | "EXPIRED"
              | "INACTIVE")
          : undefined,
    }),
  );
  const statsQuery = useQuery(trpc.subscriptions.stats.queryOptions());

  const createMutation = useMutation(
    trpc.membershipPlans.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        setIsCreateOpen(false);
        toast.success("Plan created");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.membershipPlans.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        setEditingPlan(null);
        toast.success("Plan updated");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const archiveMutation = useMutation(
    trpc.membershipPlans.archive.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        toast.success("Plan archived");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const filteredPlans = React.useMemo(() => {
    let result = plansQuery.data ?? [];

    if (plansStatusFilter.length > 0) {
      result = result.filter((p) =>
        plansStatusFilter.includes(p.isActive ? "active" : "inactive"),
      );
    }
    if (plansVisibilityFilter.length > 0) {
      result = result.filter((p) =>
        plansVisibilityFilter.includes(p.isPublic ? "public" : "hidden"),
      );
    }
    if (plansTypeFilter.length > 0) {
      result = result.filter((p) => plansTypeFilter.includes(p.type));
    }
    if (plansBillingFilter.length > 0) {
      result = result.filter((p) =>
        plansBillingFilter.includes(p.billingInterval),
      );
    }
    if (plansSearch.trim()) {
      const q = plansSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q),
      );
    }

    const [col, dir] = plansSort.split(".");
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (col === "name") cmp = a.name.localeCompare(b.name);
      else if (col === "price") cmp = Number(a.price) - Number(b.price);
      else if (col === "members")
        cmp = a._count.studioMembership - b._count.studioMembership;
      return dir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [
    plansQuery.data,
    plansSearch,
    plansSort,
    plansStatusFilter,
    plansVisibilityFilter,
    plansTypeFilter,
    plansBillingFilter,
  ]);

  const filteredMembers = React.useMemo(() => {
    let result = membersQuery.data ?? [];

    if (membersStatusFilter.length > 1) {
      result = result.filter((m) => membersStatusFilter.includes(m.status));
    }
    if (membersSearch.trim()) {
      const q = membersSearch.toLowerCase();
      result = result.filter(
        (m) =>
          m.client.name?.toLowerCase().includes(q) ||
          m.client.email?.toLowerCase().includes(q) ||
          (m.membershipPlan?.name ?? m.name).toLowerCase().includes(q),
      );
    }

    const [col, dir] = membersSort.split(".");
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (col === "name")
        cmp = (a.client.name ?? "").localeCompare(b.client.name ?? "");
      else if (col === "endDate") {
        const aDate = a.endDate ? new Date(a.endDate).getTime() : 0;
        const bDate = b.endDate ? new Date(b.endDate).getTime() : 0;
        cmp = aDate - bDate;
      }
      return dir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [membersQuery.data, membersSearch, membersSort, membersStatusFilter]);

  const planColumns = React.useMemo<ColumnDef<PlanRow>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Plan",
        meta: { label: "Plan" },
        enableHiding: false,
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="text-xs font-medium text-primary">
              {row.original.name}
            </p>
            <p className="max-w-md truncate text-[11px] text-primary/40">
              {row.original.description ?? "No description"}
            </p>
          </div>
        ),
      },
      {
        id: "status",
        accessorFn: (row) => (row.isActive ? "Active" : "Inactive"),
        header: "Status",
        meta: { label: "Status" },
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={
              row.original.isActive
                ? "border-emerald-500/40 text-emerald-500"
                : "border-primary/20 text-primary/40"
            }
          >
            {row.original.isActive ? "Active" : "Inactive"}
          </Badge>
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
        id: "price",
        accessorFn: (row) => Number(row.price),
        header: "Price",
        meta: { label: "Price" },
        cell: ({ row }) => (
          <span className="text-xs font-medium">
            {money(row.original.price, row.original.currency)}
          </span>
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
            {intervalLabel(row.original.billingInterval)}
          </span>
        ),
      },
      {
        id: "credits",
        accessorKey: "classCredits",
        header: "Credits",
        meta: { label: "Credits" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/50">
            {row.original.classCredits ?? "Unlimited"}
          </span>
        ),
      },
      {
        id: "members",
        accessorFn: (row) => row._count.studioMembership,
        header: "Clients",
        meta: { label: "Clients" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/50">
            {row.original._count.studioMembership}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setEditingPlan(row.original)}
            >
              <Pencil className="size-3.5" />
            </Button>
            {row.original.isActive && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-amber-600"
                disabled={archiveMutation.isPending}
                onClick={() => archiveMutation.mutate({ id: row.original.id })}
              >
                <Archive className="size-3.5" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [archiveMutation],
  );

  const memberColumns = React.useMemo<ColumnDef<MemberRow>[]>(
    () => [
      {
        id: "member",
        accessorFn: (row) => row.client.name,
        header: "Member",
        meta: { label: "Member" },
        enableHiding: false,
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="text-xs font-medium text-primary">
              {row.original.client.name}
            </p>
            <p className="text-[11px] text-primary/40">
              {row.original.client.email ??
                row.original.client.phone ??
                "No client detail"}
            </p>
          </div>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        meta: { label: "Status" },
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn(
              "text-[11px] w-fit capitalize",
              memberStatusTone(row.original.status),
            )}
          >
            {row.original.status.charAt(0) +
              row.original.status.slice(1).toLowerCase()}
          </Badge>
        ),
      },
      {
        id: "plan",
        accessorFn: (row) => row.membershipPlan?.name ?? row.name,
        header: "Plan",
        meta: { label: "Plan" },
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="text-xs text-primary">
              {row.original.membershipPlan?.name ?? row.original.name}
            </p>
            <p className="text-[11px] text-primary/40">
              {row.original.membershipPlan
                ? planTypeLabel(row.original.membershipPlan.type)
                : "Custom"}
            </p>
          </div>
        ),
      },
      {
        id: "credits",
        header: "Credits",
        meta: { label: "Credits" },
        cell: ({ row }) => {
          const credits = row.original.classCredit.reduce(
            (total, c) => total + c.totalCredits - c.usedCredits,
            0,
          );
          return (
            <span className="text-xs text-primary/50">
              {row.original.classCredit.length ? credits : "—"}
            </span>
          );
        },
      },
      {
        id: "renewal",
        header: "Renewal",
        meta: { label: "Renewal" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/50">
            {row.original.autoRenew ? "Auto-renews" : "Manual"}
          </span>
        ),
      },
      {
        id: "endDate",
        accessorKey: "endDate",
        header: "Ends",
        meta: { label: "Ends" },
        cell: ({ row }) => (
          <span className="text-xs text-primary/50">
            {row.original.endDate
              ? format(new Date(row.original.endDate), "MMM d, yyyy")
              : "No end date"}
          </span>
        ),
      },
    ],
    [],
  );

  const PLANS_COLUMN_IDS = React.useMemo(
    () => planColumns.map((c, i) => c.id ?? `col-${i}`),
    [planColumns],
  );
  const MEMBERS_COLUMN_IDS = React.useMemo(
    () => memberColumns.map((c, i) => c.id ?? `col-${i}`),
    [memberColumns],
  );

  React.useEffect(() => {
    setPlansColumnOrder(PLANS_COLUMN_IDS);
    try {
      const stored = window.localStorage.getItem(PLANS_ORDER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setPlansColumnOrder(parsed);
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    setMembersColumnOrder(MEMBERS_COLUMN_IDS);
    try {
      const stored = window.localStorage.getItem(MEMBERS_ORDER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setMembersColumnOrder(parsed);
      }
    } catch {}
  }, []);

  const plansColumnOrderFinal =
    plansColumnOrder.length > 0 ? plansColumnOrder : PLANS_COLUMN_IDS;
  const membersColumnOrderFinal =
    membersColumnOrder.length > 0 ? membersColumnOrder : MEMBERS_COLUMN_IDS;

  return (
    <div className="space-y-0">
      <div className="flex flex-wrap items-end justify-between gap-3 p-6">
        <div>
          <h1 className="text-lg font-semibold text-primary">Memberships</h1>
          <p className="text-xs text-primary/75">
            Manage sellable plans and the members currently subscribed to them.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {statsQuery.data && (
            <div className="flex items-center gap-3 text-xs text-primary/60">
              <span className="flex items-center gap-1">
                <Users className="size-3" />
                {statsQuery.data.active} active
              </span>
              <span>{statsQuery.data.paused} paused</span>
            </div>
          )}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="size-3.5" />
                New plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create membership plan</DialogTitle>
              </DialogHeader>
              <PlanForm
                onSubmit={(data) => createMutation.mutate(data)}
                isPending={createMutation.isPending}
                submitLabel="Create plan"
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Separator className="bg-black/5 dark:bg-white/5" />

      <PageTabs
        tabs={pageTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="px-6"
      />

      <Separator className="bg-black/5 dark:bg-white/5" />

      {activeTab === "plans" ? (
        <DataTable
          columns={planColumns}
          data={filteredPlans}
          isLoading={plansQuery.isLoading}
          getRowId={(row) => row.id}
          columnVisibility={plansColumnVisibility}
          onColumnVisibilityChange={(updater) =>
            setPlansColumnVisibility(
              typeof updater === "function"
                ? (updater as (s: VisibilityState) => VisibilityState)(
                    plansColumnVisibility,
                  )
                : updater,
            )
          }
          columnOrder={plansColumnOrderFinal}
          onColumnOrderChange={(order) => {
            setPlansColumnOrder(order);
            try {
              window.localStorage.setItem(
                PLANS_ORDER_KEY,
                JSON.stringify(order),
              );
            } catch {}
          }}
          initialColumnOrder={PLANS_COLUMN_IDS}
          enableGlobalSearch={false}
          toolbar={{
            filters: (ctx) => (
              <StudioTableToolbar
                search={plansSearch}
                onSearchChange={setPlansSearch}
                searchPlaceholder="Search plans..."
                filterGroups={[
                  {
                    label: "Status",
                    options: [
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" },
                    ],
                    selectedValues: plansStatusFilter,
                    onChange: setPlansStatusFilter,
                  },
                  {
                    label: "Visibility",
                    options: [
                      { value: "public", label: "Public" },
                      { value: "hidden", label: "Hidden" },
                    ],
                    selectedValues: plansVisibilityFilter,
                    onChange: setPlansVisibilityFilter,
                  },
                  {
                    label: "Type",
                    options: PLAN_TYPES.map((t) => ({
                      value: t.value,
                      label: t.label,
                    })),
                    selectedValues: plansTypeFilter,
                    onChange: setPlansTypeFilter,
                  },
                  {
                    label: "Billing",
                    options: BILLING_INTERVALS.map((i) => ({
                      value: i.value,
                      label: i.label,
                    })),
                    selectedValues: plansBillingFilter,
                    onChange: setPlansBillingFilter,
                  },
                ]}
                sortOptions={[
                  { value: "name.asc", label: "Name A–Z" },
                  { value: "name.desc", label: "Name Z–A" },
                  { value: "price.asc", label: "Price low–high" },
                  { value: "price.desc", label: "Price high–low" },
                  { value: "members.desc", label: "Most members" },
                  { value: "members.asc", label: "Fewest members" },
                ]}
                sortValue={plansSort}
                onSortChange={setPlansSort}
                table={ctx.table}
                columnVisibility={plansColumnVisibility}
                columnOrder={plansColumnOrderFinal}
                onColumnOrderChange={(order) => {
                  setPlansColumnOrder(order);
                  try {
                    window.localStorage.setItem(
                      PLANS_ORDER_KEY,
                      JSON.stringify(order),
                    );
                  } catch {}
                }}
                initialColumnOrder={PLANS_COLUMN_IDS}
                primaryColumnId={PLANS_PRIMARY}
              />
            ),
          }}
          emptyState={
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <CreditCard className="size-8 text-primary" />
              <p className="text-sm text-primary/50">
                No membership plans match this view.
              </p>
            </div>
          }
        />
      ) : (
        <DataTable
          columns={memberColumns}
          data={filteredMembers}
          isLoading={membersQuery.isLoading}
          getRowId={(row) => row.id}
          columnVisibility={membersColumnVisibility}
          onColumnVisibilityChange={(updater) =>
            setMembersColumnVisibility(
              typeof updater === "function"
                ? (updater as (s: VisibilityState) => VisibilityState)(
                    membersColumnVisibility,
                  )
                : updater,
            )
          }
          columnOrder={membersColumnOrderFinal}
          onColumnOrderChange={(order) => {
            setMembersColumnOrder(order);
            try {
              window.localStorage.setItem(
                MEMBERS_ORDER_KEY,
                JSON.stringify(order),
              );
            } catch {}
          }}
          initialColumnOrder={MEMBERS_COLUMN_IDS}
          enableGlobalSearch={false}
          toolbar={{
            filters: (ctx) => (
              <StudioTableToolbar
                search={membersSearch}
                onSearchChange={setMembersSearch}
                searchPlaceholder="Search members..."
                filterGroups={[
                  {
                    label: "Status",
                    options: [
                      { value: "ACTIVE", label: "Active" },
                      { value: "PAUSED", label: "Paused" },
                      { value: "CANCELLED", label: "Cancelled" },
                      { value: "EXPIRED", label: "Expired" },
                    ],
                    selectedValues: membersStatusFilter,
                    onChange: setMembersStatusFilter,
                  },
                ]}
                sortOptions={[
                  { value: "name.asc", label: "Name A–Z" },
                  { value: "name.desc", label: "Name Z–A" },
                  { value: "endDate.asc", label: "Ends soonest" },
                  { value: "endDate.desc", label: "Ends latest" },
                ]}
                sortValue={membersSort}
                onSortChange={setMembersSort}
                table={ctx.table}
                columnVisibility={membersColumnVisibility}
                columnOrder={membersColumnOrderFinal}
                onColumnOrderChange={(order) => {
                  setMembersColumnOrder(order);
                  try {
                    window.localStorage.setItem(
                      MEMBERS_ORDER_KEY,
                      JSON.stringify(order),
                    );
                  } catch {}
                }}
                initialColumnOrder={MEMBERS_COLUMN_IDS}
                primaryColumnId={MEMBERS_PRIMARY}
              />
            ),
          }}
          emptyState={
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Users className="size-8 text-primary/20" />
              <p className="text-sm text-primary/50">
                No member subscriptions match this view.
              </p>
            </div>
          }
        />
      )}

      <Dialog
        open={!!editingPlan}
        onOpenChange={(open) => !open && setEditingPlan(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit membership plan</DialogTitle>
          </DialogHeader>
          {editingPlan && (
            <PlanForm
              initial={editingPlan}
              onSubmit={(data) =>
                updateMutation.mutate({ id: editingPlan.id, ...data })
              }
              isPending={updateMutation.isPending}
              submitLabel="Save changes"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
