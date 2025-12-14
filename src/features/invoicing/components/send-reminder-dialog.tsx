"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { format } from "date-fns";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";
import { Separator } from "@/components/ui/separator";

import { IconChainLink4 as PaymentLinkIcon } from "central-icons/IconChainLink4";

const formSchema = z.object({
  to: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface SendReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoiceNumber: string;
    contactName: string;
    contactEmail?: string | null;
    amountDue: string;
    currency: string;
    dueDate: string;
  };
}

const formatCurrency = (amount: string, currency: string = "USD") => {
  const numAmount = parseFloat(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(numAmount);
};

export function SendReminderDialog({
  open,
  onOpenChange,
  invoice,
}: SendReminderDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Generate payment link
  const { data: paymentLinkData } = useQuery({
    ...(trpc.invoices.generatePaymentLink as any).queryOptions({
      invoiceId: invoice.id,
      provider: "HOSTED",
    }),
    enabled: open,
  });

  const paymentLink = (paymentLinkData as any)?.paymentLink || "";

  const defaultSubject = `Payment Reminder: Invoice ${invoice.invoiceNumber}`;
  const defaultMessage = `Dear ${invoice.contactName},

This is a friendly reminder that invoice ${
    invoice.invoiceNumber
  } is currently outstanding.

Amount Due: ${formatCurrency(invoice.amountDue, invoice.currency)}
Due Date: ${format(new Date(invoice.dueDate), "MMMM dd, yyyy")}

You can view and pay this invoice online at:
${paymentLink}

Payment Methods Accepted:
- Credit/Debit Card
- Bank Transfer
- Other payment methods as configured

Please let us know if you have any questions or concerns regarding this invoice.

Thank you for your prompt attention to this matter.

Best regards`;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      to: invoice.contactEmail ?? "",
      subject: defaultSubject,
      message: defaultMessage,
    },
  });

  const { mutate: sendReminder, isPending } = useMutation(
    trpc.invoices.sendReminder.mutationOptions({
      onSuccess: (result) => {
        queryClient.invalidateQueries({
          queryKey: trpc.invoices.list.queryOptions({}).queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: trpc.invoices.getById.queryOptions({ id: invoice.id })
            .queryKey,
        });
        toast.success(`Reminder sent successfully to ${result.sentTo}`);
        onOpenChange(false);
        form.reset();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to send reminder");
      },
    })
  );

  const onSubmit = (values: FormValues) => {
    sendReminder({
      invoiceId: invoice.id,
      ...values,
    });
  };

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      form.reset({
        to: invoice.contactEmail ?? "",
        subject: defaultSubject,
        message: defaultMessage,
      });
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl px-0">
        <DialogHeader className="px-6">
          <DialogTitle>Send payment reminder</DialogTitle>
          <DialogDescription>
            Send a reminder email for invoice {invoice.invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Invoice Info */}
            <div className=" space-y-2 text-xs">
              <div className="px-6 space-y-3 pb-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice</span>
                  <span className="font-medium">{invoice.invoiceNumber}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{invoice.contactName}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount due</span>
                  <span className="font-medium text-orange-500">
                    {formatCurrency(invoice.amountDue, invoice.currency)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due date</span>
                  <span className="font-medium">
                    {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                  </span>
                </div>
              </div>
              <Separator />
              {paymentLink && (
                <div className="flex items-center gap-2 text-xs text-green-500 px-6 py-2">
                  <PaymentLinkIcon className="size-3.5" />
                  <span>Payment link will be included in the email</span>
                </div>
              )}
              <Separator />
            </div>

            <div className="px-6 space-y-4">
              {/* Email To */}
              <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Send to</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="client@example.com"
                      />
                    </FormControl>
                    <FormDescription>
                      Email address to send the reminder to
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subject */}
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Payment Reminder" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Message */}
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter your reminder message"
                        rows={10}
                        className="font-mono text-sm"
                      />
                    </FormControl>
                    <FormDescription>
                      The reminder message to send to the client
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="px-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="w-max"
                variant="gradient"
              >
                {isPending ? "Sending..." : "Send reminder"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
