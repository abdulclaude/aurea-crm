"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ColumnDef,
  ColumnOrderState,
  VisibilityState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { Mail, ShieldCheck } from "lucide-react";
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
import {
  TABLE_BADGE_COLORS,
  TableBadge,
} from "@/components/ui/table-badge";
import { StudioTableToolbar } from "@/features/studio/components/studio-table-toolbar";
import { useTRPC } from "@/trpc/client";

import { EmailTestDialog } from "./email-test-dialog";
import { SenderAddressActions } from "./sender-address-actions";
import {
  SenderAddressDialog,
  type SenderAddressRow,
} from "./sender-address-dialog";

const COLUMN_ORDER = [
  "email",
  "displayName",
  "domain",
  "replyTo",
  "status",
  "default",
  "updated",
  "actions",
];

export function SenderAddressesTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("email.asc");
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [domainFilter, setDomainFilter] = React.useState<string[]>([]);
  const [defaultFilter, setDefaultFilter] = React.useState<string[]>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(COLUMN_ORDER);
  const [editAddress, setEditAddress] = React.useState<SenderAddressRow | null>(
    null,
  );
  const [testAddress, setTestAddress] = React.useState<SenderAddressRow | null>(
    null,
  );
  const [removeAddress, setRemoveAddress] =
    React.useState<SenderAddressRow | null>(null);

  const addresses = useQuery(
    trpc.emailSettings.listSenderAddresses.queryOptions(),
  );
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: trpc.emailSettings.listSenderAddresses.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.emailDomains.list.queryKey(),
      }),
    ]);
  };
  const update = useMutation(
    trpc.emailSettings.updateSenderAddress.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        toast.success("Sender address updated");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const remove = useMutation(
    trpc.emailSettings.removeSenderAddress.mutationOptions({
      onSuccess: async () => {
        setRemoveAddress(null);
        await invalidate();
        toast.success("Sender address removed");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const rows = React.useMemo(
    () =>
      filterAndSortAddresses(addresses.data ?? [], {
        search,
        sort,
        statusFilter,
        domainFilter,
        defaultFilter,
      }),
    [
      addresses.data,
      defaultFilter,
      domainFilter,
      search,
      sort,
      statusFilter,
    ],
  );
  const updateAddress = (address: SenderAddressRow, changes: {
    isDefault?: boolean;
    isDisabled?: boolean;
  }) =>
    update.mutate({
      id: address.id,
      emailDomainId: address.emailDomainId,
      email: address.email,
      displayName: address.displayName,
      replyTo: address.replyTo,
      isDefault: changes.isDefault ?? address.isDefault,
      isDisabled: changes.isDisabled ?? address.isDisabled,
    });

  const columns = React.useMemo<ColumnDef<SenderAddressRow>[]>(
    () => [
      {
        id: "email",
        accessorKey: "email",
        header: "Sender address",
        meta: { label: "Sender address" },
        enableHiding: false,
        cell: ({ row }) => (
          <span className="text-xs font-medium">{row.original.email}</span>
        ),
      },
      {
        id: "displayName",
        accessorKey: "displayName",
        header: "Display name",
        meta: { label: "Display name" },
      },
      {
        id: "domain",
        accessorKey: "domain",
        header: "Sender domain",
        meta: { label: "Sender domain" },
      },
      {
        id: "replyTo",
        accessorKey: "replyTo",
        header: "Reply-to",
        meta: { label: "Reply-to" },
        cell: ({ row }) => row.original.replyTo ?? "Uses sender address",
      },
      {
        id: "status",
        accessorFn: senderStatus,
        header: "Status",
        meta: { label: "Status" },
        cell: ({ row }) => <SenderStatus address={row.original} />,
      },
      {
        id: "default",
        accessorFn: (row) => (row.isDefault ? "Default" : "Other"),
        header: "Default",
        meta: { label: "Default" },
        cell: ({ row }) =>
          row.original.isDefault ? (
            <TableBadge color={TABLE_BADGE_COLORS.blue}>Default</TableBadge>
          ) : (
            <span className="text-xs text-muted-foreground">No</span>
          ),
      },
      {
        id: "updated",
        accessorKey: "updatedAt",
        header: "Last updated",
        meta: { label: "Last updated" },
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {format(new Date(row.original.updatedAt), "MMM d, yy HH:mm")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        cell: ({ row }) => (
          <SenderAddressActions
            address={row.original}
            onEdit={() => setEditAddress(row.original)}
            onTest={() => setTestAddress(row.original)}
            onSetDefault={() =>
              updateAddress(row.original, { isDefault: true })
            }
            onToggleDisabled={() =>
              updateAddress(row.original, {
                isDisabled: !row.original.isDisabled,
                ...(row.original.isDefault ? { isDefault: false } : {}),
              })
            }
            onRemove={() => setRemoveAddress(row.original)}
          />
        ),
      },
    ],
    [update],
  );
  const domainOptions = React.useMemo(
    () =>
      Array.from(
        new Map(
          (addresses.data ?? []).map((address) => [
            address.emailDomainId,
            address.domain,
          ]),
        ),
      ).map(([value, label]) => ({ value, label })),
    [addresses.data],
  );

  return (
    <div className="w-full min-w-0">
      <DataTable
        columns={columns}
        data={rows}
        isLoading={addresses.isLoading}
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
              searchPlaceholder="Search sender addresses..."
              filterGroups={[
                {
                  label: "Status",
                  options: [
                    { value: "ready", label: "Ready" },
                    { value: "pending", label: "Domain pending" },
                    { value: "disabled", label: "Disabled" },
                  ],
                  selectedValues: statusFilter,
                  onChange: setStatusFilter,
                },
                {
                  label: "Domain",
                  options: domainOptions,
                  selectedValues: domainFilter,
                  onChange: setDomainFilter,
                },
                {
                  label: "Default",
                  options: [
                    { value: "default", label: "Default sender" },
                    { value: "other", label: "Other senders" },
                  ],
                  selectedValues: defaultFilter,
                  onChange: setDefaultFilter,
                },
              ]}
              sortOptions={[
                { value: "email.asc", label: "Address A-Z" },
                { value: "email.desc", label: "Address Z-A" },
                { value: "name.asc", label: "Display name A-Z" },
                { value: "updated.desc", label: "Recently updated" },
                { value: "updated.asc", label: "Oldest updated" },
              ]}
              sortValue={sort}
              onSortChange={setSort}
              table={ctx.table}
              columnVisibility={columnVisibility}
              columnOrder={columnOrder}
              onColumnOrderChange={setColumnOrder}
              initialColumnOrder={COLUMN_ORDER}
              primaryColumnId="email"
            />
          ),
        }}
        emptyState={
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Mail className="size-8 text-primary/20" />
            <p className="text-sm text-muted-foreground">
              No sender addresses match this view.
            </p>
          </div>
        }
      />
      <SenderAddressDialog
        address={editAddress}
        open={Boolean(editAddress)}
        onOpenChange={(open) => !open && setEditAddress(null)}
      />
      <EmailTestDialog
        sender={testAddress}
        open={Boolean(testAddress)}
        onOpenChange={(open) => !open && setTestAddress(null)}
      />
      <AlertDialog
        open={Boolean(removeAddress)}
        onOpenChange={(open) => !open && setRemoveAddress(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this sender address?</AlertDialogTitle>
            <AlertDialogDescription>
              It will no longer appear as an approved sender in this workspace.
              Existing delivery history is preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={() =>
                removeAddress && remove.mutate({ id: removeAddress.id })
              }
            >
              Remove sender
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SenderStatus({ address }: { address: SenderAddressRow }) {
  const status = senderStatus(address);
  return (
    <TableBadge
      color={
        status === "ready"
          ? TABLE_BADGE_COLORS.emerald
          : status === "disabled"
            ? TABLE_BADGE_COLORS.slate
            : TABLE_BADGE_COLORS.amber
      }
      className="gap-1"
    >
      <ShieldCheck className="size-3" />
      {status === "ready"
        ? "Ready"
        : status === "disabled"
          ? "Disabled"
          : "Domain pending"}
    </TableBadge>
  );
}

function senderStatus(address: SenderAddressRow) {
  if (address.isDisabled || address.domainDisabled) return "disabled";
  return address.domainStatus === "VERIFIED" &&
    address.domainLifecycleState === "ACTIVE"
    ? "ready"
    : "pending";
}

function filterAndSortAddresses(
  rows: SenderAddressRow[],
  filters: {
    search: string;
    sort: string;
    statusFilter: string[];
    domainFilter: string[];
    defaultFilter: string[];
  },
) {
  let next = [...rows];
  const query = filters.search.trim().toLowerCase();
  if (query) {
    next = next.filter((row) =>
      [row.email, row.displayName, row.domain, row.replyTo]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }
  if (filters.statusFilter.length) {
    next = next.filter((row) =>
      filters.statusFilter.includes(senderStatus(row)),
    );
  }
  if (filters.domainFilter.length) {
    next = next.filter((row) =>
      filters.domainFilter.includes(row.emailDomainId),
    );
  }
  if (filters.defaultFilter.length) {
    next = next.filter((row) =>
      filters.defaultFilter.includes(row.isDefault ? "default" : "other"),
    );
  }
  const [field, direction] = filters.sort.split(".");
  next.sort((left, right) => {
    let comparison = 0;
    if (field === "email") comparison = left.email.localeCompare(right.email);
    if (field === "name") {
      comparison = left.displayName.localeCompare(right.displayName);
    }
    if (field === "updated") {
      comparison =
        new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
    }
    return direction === "desc" ? -comparison : comparison;
  });
  return next;
}
