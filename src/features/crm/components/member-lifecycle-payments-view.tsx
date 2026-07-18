"use client";

import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { PageTabs } from "@/components/ui/page-tabs";
import { useTRPC } from "@/trpc/client";
import { MemberDataTable } from "./member-data-table";
import type { LifecycleSummary } from "./member-lifecycle-types";
import { labelize } from "./member-lifecycle-types";
import {
  invoiceColumns,
  paymentColumns,
} from "./member-payment-table-config";
import {
  PAYMENT_METHOD_COLUMN_ORDER,
  paymentMethodColumns,
} from "./member-payment-method-columns";

type PaymentsTab = "payments" | "payment-methods" | "invoices";

const PAYMENT_TABS = [
  { id: "payments", label: "Payments" },
  { id: "payment-methods", label: "Payment methods" },
  { id: "invoices", label: "Invoices" },
] satisfies Array<{ id: PaymentsTab; label: string }>;

const PAYMENT_COLUMN_ORDER = [
  "description",
  "createdAt",
  "paymentMethod",
  "status",
  "amount",
];
const INVOICE_COLUMN_ORDER = [
  "invoiceNumber",
  "issueDate",
  "dueDate",
  "status",
  "total",
  "amountDue",
];

function isPaymentsTab(value: string): value is PaymentsTab {
  return PAYMENT_TABS.some((tab) => tab.id === value);
}

export function PaymentsView({
  clientId,
  data,
}: {
  clientId: string;
  data: LifecycleSummary;
}) {
  const trpc = useTRPC();
  const [activeTab, setActiveTab] = React.useState<PaymentsTab>("payments");
  const [paymentStatuses, setPaymentStatuses] = React.useState<string[]>([]);
  const [paymentTypes, setPaymentTypes] = React.useState<string[]>([]);
  const [invoiceStatuses, setInvoiceStatuses] = React.useState<string[]>([]);
  const [cardBrands, setCardBrands] = React.useState<string[]>([]);
  const [defaultStatuses, setDefaultStatuses] = React.useState<string[]>([]);
  const invoicesQuery = useQuery({
    ...trpc.invoices.list.queryOptions({ clientId, limit: 100 }),
    enabled: activeTab === "invoices",
  });
  const paymentMethodsQuery = useQuery({
    ...trpc.clients.paymentMethods.queryOptions({ id: clientId }),
    enabled: activeTab === "payment-methods",
  });
  const payments = data.payments.filter(
    (payment) =>
      (!paymentStatuses.length || paymentStatuses.includes(payment.status)) &&
      (!paymentTypes.length || paymentTypes.includes(payment.type)),
  );
  const invoices = (invoicesQuery.data?.invoices ?? []).filter(
    (invoice) =>
      !invoiceStatuses.length || invoiceStatuses.includes(invoice.status),
  );
  const allPaymentMethods = paymentMethodsQuery.data?.methods ?? [];
  const paymentMethods = allPaymentMethods.filter(
    (method) =>
      (!cardBrands.length || cardBrands.includes(method.brand)) &&
      (!defaultStatuses.length ||
        defaultStatuses.includes(method.isDefault ? "DEFAULT" : "OTHER")),
  );
  const paymentStatusOptions = Array.from(
    new Set(data.payments.map((payment) => payment.status)),
  ).map((status) => ({ value: status, label: labelize(status) }));
  const paymentTypeOptions = Array.from(
    new Set(data.payments.map((payment) => payment.type)),
  ).map((type) => ({ value: type, label: labelize(type) }));
  const invoiceStatusOptions = Array.from(
    new Set((invoicesQuery.data?.invoices ?? []).map((invoice) => invoice.status)),
  ).map((status) => ({ value: status, label: labelize(status) }));
  const cardBrandOptions = Array.from(
    new Set(allPaymentMethods.map((method) => method.brand)),
  ).map((brand) => ({ value: brand, label: labelize(brand) }));

  return (
    <div className="space-y-4">
      <PageTabs
        tabs={PAYMENT_TABS}
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (isPaymentsTab(tab)) setActiveTab(tab);
        }}
        className="px-4 sm:px-6"
      />

      {activeTab === "payments" ? (
        <MemberDataTable
          data={payments}
          columns={paymentColumns}
          getRowId={(payment) => payment.id}
          initialColumnOrder={PAYMENT_COLUMN_ORDER}
          primaryColumnId="description"
          searchPlaceholder="Search payments..."
          emptyLabel="No payment history yet."
          filterGroups={[
            {
              label: "Status",
              options: paymentStatusOptions,
              selectedValues: paymentStatuses,
              onChange: setPaymentStatuses,
            },
            {
              label: "Payment type",
              options: paymentTypeOptions,
              selectedValues: paymentTypes,
              onChange: setPaymentTypes,
            },
          ]}
        />
      ) : null}

      {activeTab === "payment-methods" ? (
        <MemberDataTable
          data={paymentMethods}
          columns={paymentMethodColumns}
          getRowId={(method) => method.id}
          initialColumnOrder={PAYMENT_METHOD_COLUMN_ORDER}
          primaryColumnId="card"
          searchPlaceholder="Search payment methods..."
          emptyLabel={
            paymentMethodsQuery.error
              ? paymentMethodsQuery.error.message
              : paymentMethodsQuery.data?.availability === "NO_CONNECTION"
                ? "Connect this workspace to Stripe to view saved cards."
                : "No saved cards are available for this client."
          }
          isLoading={paymentMethodsQuery.isLoading}
          filterGroups={[
            {
              label: "Card brand",
              options: cardBrandOptions,
              selectedValues: cardBrands,
              onChange: setCardBrands,
            },
            {
              label: "Default card",
              options: [
                { value: "DEFAULT", label: "Default" },
                { value: "OTHER", label: "Not default" },
              ],
              selectedValues: defaultStatuses,
              onChange: setDefaultStatuses,
            },
          ]}
        />
      ) : null}

      {activeTab === "invoices" ? (
        <MemberDataTable
          data={invoices}
          columns={invoiceColumns}
          getRowId={(invoice) => invoice.id}
          initialColumnOrder={INVOICE_COLUMN_ORDER}
          primaryColumnId="invoiceNumber"
          searchPlaceholder="Search invoices..."
          emptyLabel="No invoices for this client."
          isLoading={invoicesQuery.isLoading}
          filterGroups={[
            {
              label: "Status",
              options: invoiceStatusOptions,
              selectedValues: invoiceStatuses,
              onChange: setInvoiceStatuses,
            },
          ]}
        />
      ) : null}
    </div>
  );
}
