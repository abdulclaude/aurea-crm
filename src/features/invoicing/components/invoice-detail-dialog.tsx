"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Mail, MoreHorizontal, Pencil, Send, FileText } from "lucide-react";

import { IconFilePdf as Download } from "central-icons/IconFilePdf";
import { IconCreditCard2 as RecordPaymentIcon } from "central-icons/IconCreditCard2";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { InvoiceStatus } from "@prisma/client";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { SendReminderDialog } from "./send-reminder-dialog";

interface InvoiceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  onEdit?: (invoiceId: string) => void;
}

const getStatusBadge = (status: InvoiceStatus) => {
  const variants: Record<InvoiceStatus, { label: string; className: string }> =
    {
      DRAFT: {
        label: "Draft",
        className: "bg-gray-500/10 text-gray-500 ring-gray-500/20",
      },
      SENT: {
        label: "Sent",
        className: "bg-blue-500/10 text-blue-500 ring-blue-500/20",
      },
      VIEWED: {
        label: "Viewed",
        className: "bg-purple-500/10 text-purple-500 ring-purple-500/20",
      },
      PAID: {
        label: "Paid",
        className: "bg-green-500/10 text-green-500 ring-green-500/20",
      },
      PARTIALLY_PAID: {
        label: "Partial",
        className: "bg-yellow-500/10 text-yellow-500 ring-yellow-500/20",
      },
      OVERDUE: {
        label: "Overdue",
        className: "bg-red-500/10 text-red-500 ring-red-500/20",
      },
      CANCELLED: {
        label: "Cancelled",
        className: "bg-gray-500/10 text-gray-500 ring-gray-500/20",
      },
    };

  const variant = variants[status];

  return (
    <Badge variant="outline" className={cn("text-xs", variant.className)}>
      {variant.label}
    </Badge>
  );
};

const formatCurrency = (amount: string, currency: string = "USD") => {
  const numAmount = parseFloat(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(numAmount);
};

export function InvoiceDetailDialog({
  open,
  onOpenChange,
  invoiceId,
  onEdit,
}: InvoiceDetailDialogProps) {
  const trpc = useTRPC();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    ...trpc.invoices.getById.queryOptions({ id: invoiceId }),
    enabled: open,
  });

  if (isLoading || !invoice) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Loading invoice...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isOverdue =
    new Date(invoice.dueDate) < new Date() &&
    invoice.status !== InvoiceStatus.PAID;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto px-0">
          <DialogHeader>
            <div className="flex items-start justify-between px-6 pr-10">
              <div>
                <DialogTitle className="text-2xl">
                  {invoice.invoiceNumber}
                </DialogTitle>
                <DialogDescription>
                  {invoice.title || "Invoice Details"}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(invoice.status)}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel className="text-xs font-medium text-primary/75">
                      Actions
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => onEdit?.(invoice.id)}>
                      <Pencil className="size-3.5" />
                      Edit invoice
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setReminderDialogOpen(true)}
                    >
                      <Send className="size-3.5" />
                      Send reminder
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setPaymentDialogOpen(true)}
                    >
                      <RecordPaymentIcon className="size-3.5" />
                      Record payment
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem>
                      <Download className="size-3.5" />
                      Download PDF
                    </DropdownMenuItem>

                    <DropdownMenuItem>
                      <Mail className="size-3.5" />
                      Send to client
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </DialogHeader>

          <Separator />

          <div className="space-y-6">
            {/* Client & Dates Section */}
            <div className="grid grid-cols-2 gap-6 px-6">
              {/* Client Info */}
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-primary/75">Bill to</h3>

                <div>
                  <p className="text-xs font-medium">{invoice.contactName}</p>
                  {invoice.contactEmail && (
                    <p className="text-xs text-muted-foreground">
                      {invoice.contactEmail}
                    </p>
                  )}
                </div>
              </div>

              {/* Date Info */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <p className="text-primary/75">Issue date</p>
                    <p className="text-xs font-medium">
                      {format(new Date(invoice.issueDate), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-primary/75">Due date</p>
                    <p
                      className={cn(
                        "text-xs font-medium",
                        isOverdue && "text-red-500"
                      )}
                    >
                      {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Line Items */}
            <div className="space-y-4 px-6">
              <h3 className="text-xs font-medium text-primary/75">
                Line items
              </h3>
              <div className="rounded-lg border">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="text-xs text-muted-foreground">
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-right p-3 font-medium w-24">Qty</th>
                      <th className="text-right p-3 font-medium w-32">Rate</th>
                      <th className="text-right p-3 font-medium w-32">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lineItems.map((item, index) => (
                      <tr
                        key={item.id}
                        className={cn(
                          "text-sm",
                          index !== invoice.lineItems.length - 1 && "border-b"
                        )}
                      >
                        <td className="p-3 text-xs">{item.description}</td>
                        <td className="p-3 text-right text-xs">
                          {item.quantity}
                        </td>
                        <td className="p-3 text-right text-xs font-medium">
                          {formatCurrency(item.unitPrice, invoice.currency)}
                        </td>
                        <td className="p-3 text-right text-xs font-medium">
                          {formatCurrency(item.amount, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-80 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-primary/75">Subtotal</span>
                    <span>
                      {formatCurrency(invoice.subtotal, invoice.currency)}
                    </span>
                  </div>
                  {invoice.taxRate && parseFloat(invoice.taxRate) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-primary/75">
                        Tax ({invoice.taxRate}%)
                      </span>
                      <span>
                        {formatCurrency(invoice.taxAmount, invoice.currency)}
                      </span>
                    </div>
                  )}
                  {invoice.discountAmount &&
                    parseFloat(invoice.discountAmount) > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span className="text-primary/75">Discount</span>
                        <span>
                          -
                          {formatCurrency(
                            invoice.discountAmount,
                            invoice.currency
                          )}
                        </span>
                      </div>
                    )}
                  <Separator />
                  <div className="flex justify-between text-sm font-bold">
                    <span>Total</span>
                    <span>
                      {formatCurrency(invoice.total, invoice.currency)}
                    </span>
                  </div>
                  {parseFloat(invoice.amountPaid) > 0 && (
                    <>
                      <div className="flex justify-between text-green-600">
                        <span>Amount paid</span>
                        <span>
                          {formatCurrency(invoice.amountPaid, invoice.currency)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-base font-bold">
                        <span>Amount due</span>
                        <span
                          className={cn(
                            parseFloat(invoice.amountDue) > 0 && isOverdue
                              ? "text-red-500"
                              : "text-green-500"
                          )}
                        >
                          {formatCurrency(invoice.amountDue, invoice.currency)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Payment History */}
            {invoice.payments && invoice.payments.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Payment History</h3>
                  <div className="rounded-lg border divide-y">
                    {invoice.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="p-3 flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <RecordPaymentIcon className="size-4 text-green-500" />
                          <div>
                            <p className="font-medium">
                              {formatCurrency(payment.amount, payment.currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(
                                new Date(payment.paidAt),
                                "MMM dd, yyyy 'at' h:mm a"
                              )}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {payment.method}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Reminder History */}
            {invoice.reminders && invoice.reminders.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3 px-6">
                  <h3 className="text-xs font-medium text-primary/75">
                    Reminder history
                  </h3>
                  <div className="rounded-lg border divide-y">
                    {invoice.reminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className="p-4 flex items-center gap-3 text-sm"
                      >
                        <Send className="size-3 text-blue-500" />
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">
                            Sent to {reminder.sentTo} on{" "}
                            {format(
                              new Date(reminder.sentAt),
                              "MMM dd, yyyy 'at' h:mm a"
                            )}
                          </p>
                        </div>
                        {reminder.opened && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-green-500/10 text-green-500 border-green-500/20"
                          >
                            Opened
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {(invoice.notes || invoice.termsConditions) && (
              <>
                <Separator />
                <div className="space-y-4 px-6">
                  {invoice.notes && (
                    <div className="space-y-1">
                      <h3 className="text-xs font-medium">Notes</h3>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {invoice.notes}
                      </p>
                    </div>
                  )}
                  {invoice.termsConditions && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-medium">
                        Terms and conditions
                      </h3>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {invoice.termsConditions}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoice={invoice}
      />

      {/* Send Reminder Dialog */}
      <SendReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        invoice={invoice as any}
      />
    </>
  );
}
