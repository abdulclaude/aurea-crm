"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import * as React from "react";

import { MemberDataTable } from "./member-data-table";
import type { LifecycleSummary } from "./member-lifecycle-types";
import { labelize } from "./member-lifecycle-types";
import { MemberStatusBadge } from "./member-status-badge";

type PricingOptionRow = LifecycleSummary["memberships"][number];

const PRICING_OPTION_COLUMN_ORDER = [
  "pricingOption",
  "status",
  "price",
  "billingInterval",
  "startDate",
  "renewalDate",
  "autoRenew",
];

const pricingOptionColumns: ColumnDef<PricingOptionRow>[] = [
  {
    id: "pricingOption",
    accessorFn: (row) => row.plan?.name ?? row.name,
    header: "Pricing option",
    meta: { label: "Pricing option" },
    enableHiding: false,
  },
  {
    accessorKey: "status",
    header: "Subscription status",
    meta: { label: "Subscription status" },
    cell: ({ row }) => <MemberStatusBadge status={row.original.status} />,
  },
  {
    id: "price",
    accessorFn: (row) => row.plan?.price ?? "",
    header: "Price",
    meta: { label: "Price" },
    cell: ({ row }) =>
      row.original.plan
        ? new Intl.NumberFormat("en-GB", {
            style: "currency",
            currency: "GBP",
          }).format(Number(row.original.plan.price))
        : "Not recorded",
  },
  {
    id: "billingInterval",
    accessorFn: (row) => row.plan?.billingInterval ?? "",
    header: "Billing cadence",
    meta: { label: "Billing cadence" },
    cell: ({ row }) =>
      row.original.plan
        ? labelize(row.original.plan.billingInterval)
        : "Not recorded",
  },
  {
    accessorKey: "startDate",
    header: "Start date",
    meta: { label: "Start date" },
    cell: ({ row }) => format(new Date(row.original.startDate), "d MMM yyyy"),
  },
  {
    accessorKey: "renewalDate",
    header: "Next renewal",
    meta: { label: "Next renewal" },
    cell: ({ row }) =>
      row.original.renewalDate
        ? format(new Date(row.original.renewalDate), "d MMM yyyy")
        : "Not scheduled",
  },
  {
    accessorKey: "autoRenew",
    header: "Auto-renew",
    meta: { label: "Auto-renew" },
    cell: ({ row }) => (row.original.autoRenew ? "Enabled" : "Disabled"),
  },
];

export function MemberPricingOptionsView({
  data,
}: {
  data: LifecycleSummary;
}) {
  const [statuses, setStatuses] = React.useState<string[]>([]);
  const rows = statuses.length
    ? data.memberships.filter((membership) =>
        statuses.includes(membership.status),
      )
    : data.memberships;
  const statusOptions = Array.from(
    new Set(data.memberships.map((membership) => membership.status)),
  ).map((status) => ({ value: status, label: labelize(status) }));

  return (
    <div className="py-5">
      <MemberDataTable
        columns={pricingOptionColumns}
        data={rows}
        getRowId={(membership) => membership.id}
        initialColumnOrder={PRICING_OPTION_COLUMN_ORDER}
        primaryColumnId="pricingOption"
        searchPlaceholder="Search pricing options..."
        emptyLabel="This client is not subscribed to a pricing option."
        filterGroups={[
          {
            label: "Subscription status",
            options: statusOptions,
            selectedValues: statuses,
            onChange: setStatuses,
          },
        ]}
      />
    </div>
  );
}
