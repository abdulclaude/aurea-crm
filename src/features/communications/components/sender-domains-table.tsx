"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnOrderState,
  VisibilityState,
} from "@tanstack/react-table";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  Globe2,
  MoreHorizontal,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TABLE_BADGE_COLORS, TableBadge } from "@/components/ui/table-badge";
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
import { resendDnsRecordsSchema } from "@/features/communications/contracts";
import { StudioTableToolbar } from "@/features/studio/components/studio-table-toolbar";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/routers/_app";

import { DnsRecordsDialog } from "./dns-records-dialog";

type RouterOutput = inferRouterOutputs<AppRouter>;
type DomainRow = RouterOutput["emailDomains"]["list"][number];

const COLUMN_ORDER = [
  "domain",
  "status",
  "dns",
  "defaultSender",
  "lastChecked",
  "added",
  "actions",
];

export function SenderDomainsTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("added.desc");
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [availabilityFilter, setAvailabilityFilter] = React.useState<string[]>(
    [],
  );
  const [defaultFilter, setDefaultFilter] = React.useState<string[]>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(COLUMN_ORDER);
  const [deleteDomain, setDeleteDomain] = React.useState<DomainRow | null>(
    null,
  );
  const [dnsDomain, setDnsDomain] = React.useState<DomainRow | null>(null);

  const domainsQuery = useQuery({
    ...trpc.emailDomains.list.queryOptions(),
    refetchInterval: (query) =>
      query.state.data?.some(
        (domain) =>
          domain.status === "VERIFYING" ||
          domain.lifecycleState === "PROVISIONING" ||
          domain.lifecycleState === "RELEASE_SCHEDULED",
      )
        ? 5_000
        : false,
  });
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.emailDomains.list.queryKey(),
    });
  const verify = useMutation(
    trpc.emailDomains.verify.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        toast.success("Domain verification started");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const refresh = useMutation(
    trpc.emailDomains.checkStatus.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        toast.success("Domain status refresh queued");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const update = useMutation(
    trpc.emailDomains.update.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        toast.success("Domain updated");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const remove = useMutation(
    trpc.emailDomains.delete.mutationOptions({
      onSuccess: async () => {
        setDeleteDomain(null);
        await invalidate();
        toast.success("Domain deletion started");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const rows = React.useMemo(() => {
    let next = [...(domainsQuery.data ?? [])];
    const query = search.trim().toLowerCase();
    if (query) {
      next = next.filter((domain) =>
        [domain.domain, domain.defaultFromName, domain.defaultFromEmail]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(query)),
      );
    }
    if (statusFilter.length) {
      next = next.filter((domain) => statusFilter.includes(domain.status));
    }
    if (availabilityFilter.length) {
      next = next.filter((domain) =>
        availabilityFilter.includes(domain.isDisabled ? "disabled" : "enabled"),
      );
    }
    if (defaultFilter.length) {
      next = next.filter((domain) =>
        defaultFilter.includes(domain.isDefault ? "default" : "other"),
      );
    }
    const [field, direction] = sort.split(".");
    next.sort((left, right) => {
      let comparison = 0;
      if (field === "domain")
        comparison = left.domain.localeCompare(right.domain);
      if (field === "status")
        comparison = left.status.localeCompare(right.status);
      if (field === "added") {
        comparison =
          new Date(left.createdAt).getTime() -
          new Date(right.createdAt).getTime();
      }
      if (field === "checked") {
        comparison =
          new Date(left.lastCheckedAt ?? 0).getTime() -
          new Date(right.lastCheckedAt ?? 0).getTime();
      }
      return direction === "desc" ? -comparison : comparison;
    });
    return next;
  }, [
    availabilityFilter,
    defaultFilter,
    domainsQuery.data,
    search,
    sort,
    statusFilter,
  ]);

  const columns = React.useMemo<ColumnDef<DomainRow>[]>(
    () => [
      {
        id: "domain",
        accessorKey: "domain",
        header: "Sender domain",
        meta: { label: "Sender domain" },
        enableHiding: false,
        cell: ({ row }) => (
          <div>
            <p className="text-xs font-medium">{row.original.domain}</p>
            <p className="text-[11px] text-muted-foreground">
              {row.original.isDefault ? "Default domain" : "Custom domain"}
            </p>
          </div>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        meta: { label: "Status" },
        cell: ({ row }) => <DomainStatus domain={row.original} />,
      },
      {
        id: "dns",
        header: "DNS records",
        meta: { label: "DNS records" },
        cell: ({ row }) => {
          const parsed = resendDnsRecordsSchema.safeParse(
            row.original.dnsRecords,
          );
          return (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-0 text-xs"
              disabled={!parsed.success || parsed.data.length === 0}
              onClick={() => setDnsDomain(row.original)}
            >
              <Globe2 />
              {parsed.success ? `${parsed.data.length} records` : "Pending"}
            </Button>
          );
        },
      },
      {
        id: "defaultSender",
        accessorFn: (row) => row.defaultFromEmail ?? "",
        header: "Default sender",
        meta: { label: "Default sender" },
        cell: ({ row }) => (
          <div>
            <p className="text-xs">
              {row.original.defaultFromEmail ?? "Not configured"}
            </p>
            {row.original.defaultFromName ? (
              <p className="text-[11px] text-muted-foreground">
                {row.original.defaultFromName}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "lastChecked",
        accessorKey: "lastCheckedAt",
        header: "Last checked",
        meta: { label: "Last checked" },
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.lastCheckedAt
              ? format(new Date(row.original.lastCheckedAt), "MMM d, yy HH:mm")
              : "Not checked"}
          </span>
        ),
      },
      {
        id: "added",
        accessorKey: "createdAt",
        header: "Added",
        meta: { label: "Added" },
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {format(new Date(row.original.createdAt), "MMM d, yy")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        cell: ({ row }) => (
          <DomainActions
            domain={row.original}
            onDns={() => setDnsDomain(row.original)}
            onVerify={() => verify.mutate({ id: row.original.id })}
            onRefresh={() => refresh.mutate({ id: row.original.id })}
            onSetDefault={() =>
              update.mutate({ id: row.original.id, isDefault: true })
            }
            onToggleDisabled={() =>
              update.mutate({
                id: row.original.id,
                isDisabled: !row.original.isDisabled,
              })
            }
            onRemove={() => setDeleteDomain(row.original)}
          />
        ),
      },
    ],
    [refresh, update, verify],
  );

  const dnsRecords = dnsDomain
    ? resendDnsRecordsSchema.safeParse(dnsDomain.dnsRecords)
    : null;

  return (
    <div className="w-full min-w-0">
      <DataTable
        columns={columns}
        data={rows}
        isLoading={domainsQuery.isLoading}
        getRowId={(row) => row.id}
        enableGlobalSearch={false}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        columnOrder={columnOrder}
        onColumnOrderChange={setColumnOrder}
        initialColumnOrder={COLUMN_ORDER}
        toolbar={{
          filters: (ctx) => (
            <StudioTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search sender domains..."
              filterGroups={[
                {
                  label: "Status",
                  options: ["PENDING", "VERIFYING", "VERIFIED", "FAILED"].map(
                    (value) => ({
                      value,
                      label: formatStatus(value),
                    }),
                  ),
                  selectedValues: statusFilter,
                  onChange: setStatusFilter,
                },
                {
                  label: "Availability",
                  options: [
                    { value: "enabled", label: "Enabled" },
                    { value: "disabled", label: "Disabled" },
                  ],
                  selectedValues: availabilityFilter,
                  onChange: setAvailabilityFilter,
                },
                {
                  label: "Default",
                  options: [
                    { value: "default", label: "Default domain" },
                    { value: "other", label: "Other domains" },
                  ],
                  selectedValues: defaultFilter,
                  onChange: setDefaultFilter,
                },
              ]}
              sortOptions={[
                { value: "domain.asc", label: "Domain A-Z" },
                { value: "domain.desc", label: "Domain Z-A" },
                { value: "status.asc", label: "Status A-Z" },
                { value: "added.desc", label: "Newest first" },
                { value: "added.asc", label: "Oldest first" },
                { value: "checked.desc", label: "Recently checked" },
              ]}
              sortValue={sort}
              onSortChange={setSort}
              table={ctx.table}
              columnVisibility={columnVisibility}
              columnOrder={columnOrder}
              onColumnOrderChange={setColumnOrder}
              initialColumnOrder={COLUMN_ORDER}
              primaryColumnId="domain"
            />
          ),
        }}
        emptyState={
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Globe2 className="size-8 text-primary/20" />
            <p className="text-sm text-muted-foreground">
              No sender domains match this view.
            </p>
          </div>
        }
      />
      <DnsRecordsDialog
        domain={dnsDomain?.domain ?? ""}
        records={dnsRecords?.success ? dnsRecords.data : []}
        open={Boolean(dnsDomain)}
        onOpenChange={(open) => !open && setDnsDomain(null)}
      />
      <AlertDialog
        open={Boolean(deleteDomain)}
        onOpenChange={(open) => !open && setDeleteDomain(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sender domain?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the domain and its sender addresses from
              Aurea and deletes the domain from Resend. DNS records at your
              provider are not changed automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={() =>
                deleteDomain && remove.mutate({ id: deleteDomain.id })
              }
            >
              Delete domain
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DomainStatus({ domain }: { domain: DomainRow }) {
  const deletionFailed =
    domain.isDisabled &&
    domain.lifecycleState === "FAILED" &&
    Boolean(domain.lastErrorMessage);
  const deletionPending = domain.lifecycleState === "RELEASE_SCHEDULED";
  const color = deletionFailed
    ? TABLE_BADGE_COLORS.rose
    : deletionPending
      ? TABLE_BADGE_COLORS.amber
      : domain.isDisabled
        ? TABLE_BADGE_COLORS.slate
        : domain.status === "VERIFIED"
          ? TABLE_BADGE_COLORS.emerald
          : domain.status === "FAILED"
            ? TABLE_BADGE_COLORS.rose
            : TABLE_BADGE_COLORS.amber;
  return (
    <TableBadge color={color} className="gap-1">
      {deletionFailed
        ? "Deletion failed"
        : deletionPending
          ? "Deleting"
          : domain.isDisabled
            ? "Disabled"
            : formatStatus(domain.status)}
    </TableBadge>
  );
}

function DomainActions({
  domain,
  onDns,
  onVerify,
  onRefresh,
  onSetDefault,
  onToggleDisabled,
  onRemove,
}: {
  domain: DomainRow;
  onDns: () => void;
  onVerify: () => void;
  onRefresh: () => void;
  onSetDefault: () => void;
  onToggleDisabled: () => void;
  onRemove: () => void;
}) {
  const dnsRecords = resendDnsRecordsSchema.safeParse(domain.dnsRecords);
  const hasDns = dnsRecords.success && dnsRecords.data.length > 0;
  const deletionPending = domain.lifecycleState === "RELEASE_SCHEDULED";
  const deletionFailed =
    domain.isDisabled &&
    domain.lifecycleState === "FAILED" &&
    Boolean(domain.lastErrorMessage);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon">
          <span className="sr-only">Open domain actions</span>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!deletionPending && !deletionFailed ? (
          <>
            <DropdownMenuItem onSelect={onDns} disabled={!hasDns}>
              <Globe2 /> View DNS records
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onRefresh}>
              <RefreshCw /> Refresh status
            </DropdownMenuItem>
            {domain.status !== "VERIFIED" ? (
              <DropdownMenuItem onSelect={onVerify}>
                <ShieldCheck /> Verify domain
              </DropdownMenuItem>
            ) : null}
            {!domain.isDefault &&
            !domain.isDisabled &&
            domain.status === "VERIFIED" ? (
              <DropdownMenuItem onSelect={onSetDefault}>
                <CheckCircle2 /> Set as default
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={onToggleDisabled}>
              <AlertCircle />
              {domain.isDisabled ? "Enable domain" : "Disable domain"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={onRemove}
        >
          <Trash2 />{" "}
          {deletionFailed
            ? "Retry deletion"
            : deletionPending
              ? "Retry deletion"
              : "Delete domain"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatStatus(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
}
