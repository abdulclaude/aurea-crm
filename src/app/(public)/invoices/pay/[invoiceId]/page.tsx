import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { InvoiceStatus } from "@/db/enums";
import { cn } from "@/lib/utils";
import { InvoicePaymentActions } from "@/features/invoicing/components/invoice-payment-actions";
import { InvoiceStatusBadge } from "@/features/invoicing/components/invoice-status-badge";
import { PublicInvoiceAccessNotFoundError } from "@/features/invoicing/server/invoice-access-tokens";
import { getPublicInvoice } from "@/features/invoicing/server/public-invoice-access";

interface InvoicePaymentPageProps {
  params: Promise<{
    invoiceId: string;
  }>;
}

const formatCurrency = (amount: string, currency: string = "USD") => {
  const numAmount = parseFloat(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(numAmount);
};

export default async function InvoicePaymentPage({
  params,
}: InvoicePaymentPageProps) {
  const { invoiceId: accessToken } = await params;
  const invoice = await getPublicInvoice({
    token: accessToken,
    purpose: "PAY",
  }).catch((error: unknown) => {
    if (error instanceof PublicInvoiceAccessNotFoundError) {
      notFound();
    }
    throw error;
  });

  const isOverdue =
    new Date(invoice.dueDate) < new Date() &&
    invoice.status !== InvoiceStatus.PAID;

  const isPaid = invoice.status === InvoiceStatus.PAID;

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-background p-8 text-primary">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-semibold">
                  {invoice.invoiceNumber}
                </h1>
                {invoice.title && (
                  <p className="text-primary/75 text-sm">{invoice.title}</p>
                )}
              </div>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>

          <Separator />

          {/* Content */}
          <div className="space-y-8">
            {/* Bill To & Dates */}
            <div className="grid md:grid-cols-2 gap-8 p-8 pb-0">
              <div>
                <h3 className="text-sm font-medium text-primary mb-1">
                  Bill to
                </h3>

                <div className="font-medium">
                  <p className="text-xs text-primary/75">
                    {invoice.clientName}
                  </p>
                </div>
              </div>

              <div className="space-y-3 flex gap-8 w-max">
                <div className="flex flex-col text-sm gap-1">
                  <span className="text-primary">Issue date</span>

                  <span className="font-medium text-primary/75 text-xs">
                    {format(new Date(invoice.issueDate), "MMM dd, yyyy")}
                  </span>
                </div>

                <div className="flex flex-col text-sm gap-1">
                  <span className="text-primary">Due date</span>
                  <span
                    className={cn(
                      "font-medium text-primary/75 text-xs",
                      isOverdue && "text-red-500!"
                    )}
                  >
                    {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Line Items */}
            <div className="">
              <h3 className="text-sm font-medium mb-4 text-primary px-8">
                Invoice details
              </h3>
              <div className="border-y border-black/5 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="text-xs text-muted-foreground">
                      <th className="text-left p-4 px-8 font-medium">
                        Description
                      </th>
                      <th className="text-right p-4 px-8 font-medium w-24">
                        Qty
                      </th>
                      <th className="text-right p-4 px-8 font-medium w-32">
                        Rate
                      </th>
                      <th className="text-right p-4 px-8 font-medium w-32">
                        Amount
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {invoice.lineItems.map((item, index) => (
                      <tr
                        key={item.id}
                        className={cn(
                          "text-xs text-primary ",
                          index !== invoice.lineItems.length - 1 && "border-b"
                        )}
                      >
                        <td className="p-4 px-8">{item.description}</td>
                        <td className="p-4 px-8 text-right">
                          {item.quantity.toString()}
                        </td>
                        <td className="p-4 px-8 text-right">
                          {formatCurrency(
                            item.unitPrice.toString(),
                            invoice.currency
                          )}
                        </td>
                        <td className="p-4 px-8 text-right font-medium">
                          {formatCurrency(
                            item.amount.toString(),
                            invoice.currency
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end mt-6">
                <div className="w-full space-y-3 text-sm">
                  <div className="flex justify-between px-8">
                    <span className="text-primary/75 text-xs">Subtotal</span>
                    <span className="font-medium text-primary/75 text-xs">
                      {formatCurrency(
                        invoice.subtotal.toString(),
                        invoice.currency
                      )}
                    </span>
                  </div>
                  {invoice.taxRate &&
                    parseFloat(invoice.taxRate.toString()) > 0 && (
                      <div className="flex justify-between px-8">
                        <span className="text-primary/75 text-xs">
                          Tax ({invoice.taxRate.toString()}%)
                        </span>
                        <span className="font-medium text-primary/75 text-xs">
                          {formatCurrency(
                            invoice.taxAmount.toString(),
                            invoice.currency
                          )}
                        </span>
                      </div>
                    )}
                  {invoice.discountAmount &&
                    parseFloat(invoice.discountAmount.toString()) > 0 && (
                      <div className="flex justify-between px-8 text-green-600">
                        <span className="text-primary/75 text-xs">
                          Discount
                        </span>
                        <span className="font-medium text-primary/75 text-xs">
                          -
                          {formatCurrency(
                            invoice.discountAmount.toString(),
                            invoice.currency
                          )}
                        </span>
                      </div>
                    )}
                  <Separator />

                  <div className="flex justify-between px-8 text-xs font-semibold text-primary/75">
                    <span>Total</span>
                    <span>
                      {formatCurrency(
                        invoice.total.toString(),
                        invoice.currency
                      )}
                    </span>
                  </div>

                  {parseFloat(invoice.amountPaid.toString()) > 0 && (
                    <>
                      <Separator />

                      <div className="flex justify-between px-8 text-xs font-medium text-primary/75">
                        <span>Amount due</span>
                        <span
                          className={cn(
                            parseFloat(invoice.amountDue.toString()) > 0 &&
                              isOverdue
                              ? "text-red-500"
                              : "text-emerald-500"
                          )}
                        >
                          {formatCurrency(
                            invoice.amountDue.toString(),
                            invoice.currency
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between text-emerald-500 px-8 text-xs font-medium">
                        <span>Amount paid</span>
                        <span className="font-medium">
                          {formatCurrency(
                            invoice.amountPaid.toString(),
                            invoice.currency
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <InvoicePaymentActions
              accessToken={accessToken}
              invoiceNumber={invoice.invoiceNumber}
              amountDue={invoice.amountDue.toString()}
              isPaid={isPaid}
              paymentOptions={invoice.paymentOptions}
            />

            {/* Notes */}
            {(invoice.notes || invoice.termsConditions) && (
              <>
                <div className="space-y-4 text-sm px-8 pb-8">
                  {invoice.notes && (
                    <div>
                      <h3 className="font-medium mb-1 text-primary">Notes</h3>
                      <p className="text-primary/75 text-xs whitespace-pre-wrap">
                        {invoice.notes}
                      </p>
                    </div>
                  )}

                  {invoice.termsConditions && (
                    <div>
                      <h3 className="font-medium mb-1 text-primary">
                        Terms and conditions
                      </h3>
                      <p className="text-primary/75 text-xs whitespace-pre-wrap">
                        {invoice.termsConditions}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-900 px-8 py-6 text-center text-xs text-muted-foreground">
            <p>
              Questions about this invoice? Contact {invoice.merchant.name}
              {invoice.merchant.supportEmail
                ? ` at ${invoice.merchant.supportEmail}`
                : "."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
