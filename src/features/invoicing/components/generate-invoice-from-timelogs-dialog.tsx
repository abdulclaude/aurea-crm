"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import z from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  contactId: z.string().optional(),
  contactName: z.string().min(1, "Client name is required"),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  title: z.string().optional(),
  dueDate: z.date({
    message: "Due date is required",
  }),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  termsConditions: z.string().optional(),
  groupBy: z.enum(["worker", "date", "all"]).default("worker"),
});

type FormValues = z.infer<typeof formSchema>;

interface GenerateInvoiceFromTimeLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeLogIds: string[];
  onSuccess?: () => void;
}

export function GenerateInvoiceFromTimeLogsDialog({
  open,
  onOpenChange,
  timeLogIds,
  onSuccess,
}: GenerateInvoiceFromTimeLogsDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Fetch time logs to get contact information
  const { data: timeLogsData } = useQuery({
    queryKey: ["timeLogs", "forInvoice", timeLogIds],
    queryFn: async () => {
      // This will be handled by the server validation
      return null;
    },
    enabled: false, // We'll rely on server-side validation
  });

  // Fetch contacts for dropdown
  const { data: contactsData } = useQuery({
    ...trpc.contacts.list.queryOptions({
      limit: 100,
    }),
    enabled: open,
  });

  const contacts = contactsData?.items ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      contactName: "",
      contactEmail: "",
      title: "",
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      taxRate: 0,
      discountAmount: 0,
      notes: "",
      termsConditions: "",
      groupBy: "worker",
    },
  });

  // Generate mutation
  const { mutate: generateInvoice, isPending } = useMutation(
    trpc.invoices.generateFromTimeLogs.mutationOptions({
      onSuccess: (invoice) => {
        queryClient.invalidateQueries({
          queryKey: trpc.invoices.list.queryOptions({}).queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: trpc.timeTracking.list.queryOptions({}).queryKey,
        });
        toast.success(
          `Invoice ${invoice.invoiceNumber} created successfully from ${timeLogIds.length} time log(s)`
        );
        onOpenChange(false);
        form.reset();
        onSuccess?.();

        // Navigate to invoices page
        router.push("/invoices");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to generate invoice");
      },
    })
  );

  const onSubmit = (values: FormValues) => {
    generateInvoice({
      timeLogIds,
      ...values,
    });
  };

  // Watch contact selection to auto-fill email
  const selectedContactId = form.watch("contactId");
  useEffect(() => {
    if (selectedContactId && contacts.length > 0) {
      const contact = contacts.find((c) => c.id === selectedContactId);
      if (contact) {
        form.setValue("contactName", contact.name);
        form.setValue("contactEmail", contact.email ?? "");
      }
    }
  }, [selectedContactId, contacts, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto px-0">
        <DialogHeader className="px-6">
          <DialogTitle>Generate invoice from Time Logs</DialogTitle>
          <DialogDescription>
            Create an invoice from {timeLogIds.length} approved time log(s).
            <br />
            <span className="text-amber-600 dark:text-amber-500 text-xs font-medium">
              Note: All selected time logs must have a contact (client) assigned and belong to the same contact.
            </span>
          </DialogDescription>
        </DialogHeader>

        <Separator className="bg-black/10 dark:bg-white/5" />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
            {/* Client Information */}
            <div className="space-y-4 px-6">
              <h3 className="text-sm font-medium">Client Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control as any}
                  name="contactId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select contact (optional)</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose existing contact" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.name}{" "}
                              {contact.email && `(${contact.email})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="John Doe" />
                      </FormControl>
                      <FormDescription className="text-xs">
                        This name will be used in the invoice number when multiple workers are selected
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client email</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="client@example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Time Tracking Invoice" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator className="bg-black/10 dark:bg-white/5" />

            {/* Grouping Options */}
            <div className="space-y-4 px-6">
              <FormField
                control={form.control as any}
                name="groupBy"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Group line items by</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="worker" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            By worker - One line per worker with total hours
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="date" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            By date - One line per date with all shifts
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="all" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            All together - Single line with total hours
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      Choose how to organize time logs into invoice line items
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="bg-black/10 dark:bg-white/5" />

            {/* Invoice Details */}
            <div className="space-y-4 px-6">
              <h3 className="text-sm font-medium">Invoice Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control as any}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="taxRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="discountAmount"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Discount amount</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator className="bg-black/10 dark:bg-white/5" />

            {/* Notes */}
            <div className="space-y-4 px-6">
              <FormField
                control={form.control as any}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (visible to client)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Additional notes for the client"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="termsConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms and conditions</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Payment terms and conditions"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="bg-black/10 dark:bg-white/5" />

            <DialogFooter className="px-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={isPending}
                variant="gradient"
                className="w-max"
              >
                {isPending ? "Generating..." : "Generate invoice"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
