import { format } from "date-fns";
import { notFound } from "next/navigation";

import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/features/invoicing/components/invoice-status-badge";
import { PublicInvoiceAccessNotFoundError } from "@/features/invoicing/server/invoice-access-tokens";
import { getPublicInvoice } from "@/features/invoicing/server/public-invoice-access";

type InvoiceViewPageProps = {
  params: Promise<{ invoiceId: string }>;
};

export default async function InvoiceViewPage({
  params,
}: InvoiceViewPageProps) {
  const { invoiceId: accessToken } = await params;
  const invoice = await getPublicInvoice({
    token: accessToken,
    purpose: "VIEW",
  }).catch((error: unknown) => {
    if (error instanceof PublicInvoiceAccessNotFoundError) {
      notFound();
    }
    throw error;
  });

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-lg border bg-background">
        <header className="flex items-start justify-between gap-4 p-6 sm:p-8">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {invoice.merchant.name}
            </p>
            <h1 className="mt-1 break-words text-xl font-semibold text-foreground">
              {invoice.invoiceNumber}
            </h1>
            {invoice.title ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {invoice.title}
              </p>
            ) : null}
          </div>
          <InvoiceStatusBadge
            status={invoice.status}
            label={formatStatus(invoice.status)}
          />
        </header>

        <Separator />

        <section className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
          <div>
            <p className="text-xs text-muted-foreground">Bill to</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {invoice.clientName}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:justify-self-end">
            <div>
              <dt className="text-xs text-muted-foreground">Issue date</dt>
              <dd className="mt-1 text-foreground">
                {format(invoice.issueDate, "MMM dd, yyyy")}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Due date</dt>
              <dd className="mt-1 text-foreground">
                {format(invoice.dueDate, "MMM dd, yyyy")}
              </dd>
            </div>
          </dl>
        </section>

        <Separator />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6 sm:px-8">Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="px-6 text-right sm:px-8">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.lineItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="px-6 sm:px-8">
                  {item.description}
                </TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.unitPrice, invoice.currency)}
                </TableCell>
                <TableCell className="px-6 text-right font-medium sm:px-8">
                  {formatCurrency(item.amount, invoice.currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Separator />

        <section className="space-y-3 p-6 text-sm sm:ml-auto sm:w-96 sm:p-8">
          <AmountRow
            label="Subtotal"
            value={formatCurrency(invoice.subtotal, invoice.currency)}
          />
          {Number(invoice.taxAmount) > 0 ? (
            <AmountRow
              label={invoice.taxRate ? `Tax (${invoice.taxRate}%)` : "Tax"}
              value={formatCurrency(invoice.taxAmount, invoice.currency)}
            />
          ) : null}
          {Number(invoice.discountAmount) > 0 ? (
            <AmountRow
              label="Discount"
              value={`-${formatCurrency(invoice.discountAmount, invoice.currency)}`}
            />
          ) : null}
          <Separator />
          <AmountRow
            label="Total"
            value={formatCurrency(invoice.total, invoice.currency)}
            strong
          />
          <AmountRow
            label="Amount due"
            value={formatCurrency(invoice.amountDue, invoice.currency)}
            strong
          />
        </section>

        {invoice.notes || invoice.termsConditions ? <Separator /> : null}
        {invoice.notes || invoice.termsConditions ? (
          <section className="space-y-5 p-6 text-sm sm:p-8">
            {invoice.notes ? (
              <div>
                <h2 className="font-medium text-foreground">Notes</h2>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                  {invoice.notes}
                </p>
              </div>
            ) : null}
            {invoice.termsConditions ? (
              <div>
                <h2 className="font-medium text-foreground">
                  Terms and conditions
                </h2>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                  {invoice.termsConditions}
                </p>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}

function AmountRow(input: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={input.strong ? "font-medium" : "text-muted-foreground"}>
        {input.label}
      </span>
      <span className={input.strong ? "font-semibold" : "font-medium"}>
        {input.value}
      </span>
    </div>
  );
}

function formatCurrency(amount: string, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(Number(amount));
}

function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
