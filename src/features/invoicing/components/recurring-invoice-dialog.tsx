"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { format } from "date-fns";
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
import { Switch } from "@/components/ui/switch";
import { BillingModel, RecurringFrequency } from "@prisma/client";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unitPrice: z.coerce.number().min(0, "Unit price must be positive"),
});

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  contactId: z.string().optional(),
  contactName: z.string().min(1, "Client name is required"),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  frequency: z.nativeEnum(RecurringFrequency),
  interval: z.coerce.number().int().min(1, "Interval must be at least 1").default(1),
  startDate: z.date(),
  endDate: z.date().optional(),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  currency: z.string().default("USD"),
  dueDays: z.coerce.number().int().min(0).default(30),
  notes: z.string().optional(),
  termsConditions: z.string().optional(),
  autoSend: z.boolean().default(false),
  sendReminders: z.boolean().default(false),
  templateId: z.string().optional(),
  billingModel: z.nativeEnum(BillingModel).default(BillingModel.RETAINER),
});

type FormValues = z.infer<typeof formSchema>;

interface RecurringInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurringInvoiceId?: string;
}

export function RecurringInvoiceDialog({
  open,
  onOpenChange,
  recurringInvoiceId,
}: RecurringInvoiceDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const isEdit = !!recurringInvoiceId;

  // Fetch recurring invoice if editing
  const { data: recurringInvoice } = useQuery({
    ...trpc.recurringInvoices.getById.queryOptions({ id: recurringInvoiceId! }),
    enabled: isEdit && open,
  });

  // Fetch contacts for dropdown
  const { data: contactsData } = useQuery({
    ...trpc.contacts.list.queryOptions({
      limit: 100,
    }),
    enabled: open,
  });

  // Fetch invoice templates
  const { data: templatesData } = useQuery({
    ...trpc.invoices.listTemplates.queryOptions({}),
    enabled: open,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      contactName: "",
      contactEmail: "",
      frequency: RecurringFrequency.MONTHLY,
      interval: 1,
      startDate: new Date(),
      lineItems: [{ description: "", quantity: 1, unitPrice: 0 }],
      taxRate: 0,
      discountAmount: 0,
      currency: "USD",
      dueDays: 30,
      autoSend: false,
      sendReminders: false,
      billingModel: BillingModel.RETAINER,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  // Populate form when editing
  useEffect(() => {
    if (recurringInvoice && open) {
      const lineItems = recurringInvoice.lineItems as Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        amount: number;
      }>;

      form.reset({
        name: recurringInvoice.name,
        description: recurringInvoice.description || "",
        contactId: recurringInvoice.contactId || undefined,
        contactName: recurringInvoice.contactName,
        contactEmail: recurringInvoice.contactEmail || "",
        frequency: recurringInvoice.frequency,
        interval: recurringInvoice.interval,
        startDate: new Date(recurringInvoice.startDate),
        endDate: recurringInvoice.endDate
          ? new Date(recurringInvoice.endDate)
          : undefined,
        dayOfMonth: recurringInvoice.dayOfMonth || undefined,
        dayOfWeek: recurringInvoice.dayOfWeek || undefined,
        lineItems: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        taxRate: recurringInvoice.taxRate
          ? Number(recurringInvoice.taxRate)
          : undefined,
        discountAmount: Number(recurringInvoice.discountAmount),
        currency: recurringInvoice.currency,
        dueDays: recurringInvoice.dueDays,
        notes: recurringInvoice.notes || "",
        termsConditions: recurringInvoice.termsConditions || "",
        autoSend: recurringInvoice.autoSend,
        sendReminders: recurringInvoice.sendReminders,
        templateId: recurringInvoice.templateId || undefined,
        billingModel: recurringInvoice.billingModel,
      });
    }
  }, [recurringInvoice, open, form]);

  const { mutate: createRecurringInvoice, isPending: isCreating } = useMutation(
    trpc.recurringInvoices.create.mutationOptions({
      onSuccess: () => {
        toast.success("Recurring invoice created successfully");
        queryClient.invalidateQueries({ queryKey: ["recurringInvoices"] });
        onOpenChange(false);
        form.reset();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create recurring invoice");
      },
    })
  );

  const { mutate: updateRecurringInvoice, isPending: isUpdating } = useMutation(
    trpc.recurringInvoices.update.mutationOptions({
      onSuccess: () => {
        toast.success("Recurring invoice updated successfully");
        queryClient.invalidateQueries({ queryKey: ["recurringInvoices"] });
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update recurring invoice");
      },
    })
  );

  const onSubmit = (values: FormValues) => {
    const lineItemsWithAmount = values.lineItems.map((item) => ({
      ...item,
      amount: item.quantity * item.unitPrice,
    }));

    if (isEdit) {
      updateRecurringInvoice({
        id: recurringInvoiceId,
        ...values,
        lineItems: lineItemsWithAmount,
      });
    } else {
      createRecurringInvoice({
        ...values,
        lineItems: lineItemsWithAmount,
      });
    }
  };

  const watchLineItems = form.watch("lineItems");
  const watchTaxRate = form.watch("taxRate");
  const watchDiscountAmount = form.watch("discountAmount");
  const watchFrequency = form.watch("frequency");

  const subtotal = watchLineItems.reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.unitPrice || 0);
  }, 0);

  const taxAmount = watchTaxRate ? (subtotal * watchTaxRate) / 100 : 0;
  const total = subtotal + taxAmount - (watchDiscountAmount || 0);

  const isPending = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Recurring Invoice" : "New Recurring Invoice"}
          </DialogTitle>
          <DialogDescription>
            Set up automatic invoice generation for recurring billing
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control as any}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Monthly Retainer - Acme Corp"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description of this recurring invoice"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Client Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Client Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control as any}
                  name="contactId"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Select Contact (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          const contact = contactsData?.items.find(
                            (c) => c.id === value
                          );
                          if (contact) {
                            form.setValue("contactName", contact.name);
                            form.setValue("contactEmail", contact.email || "");
                          }
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a contact" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contactsData?.items.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.name}
                              {contact.email && ` (${contact.email})`}
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
                      <FormLabel>Client Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Client name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Email (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="client@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Billing Schedule</h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control as any}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={RecurringFrequency.DAILY}>
                            Daily
                          </SelectItem>
                          <SelectItem value={RecurringFrequency.WEEKLY}>
                            Weekly
                          </SelectItem>
                          <SelectItem value={RecurringFrequency.BIWEEKLY}>
                            Bi-weekly
                          </SelectItem>
                          <SelectItem value={RecurringFrequency.MONTHLY}>
                            Monthly
                          </SelectItem>
                          <SelectItem value={RecurringFrequency.QUARTERLY}>
                            Quarterly
                          </SelectItem>
                          <SelectItem value={RecurringFrequency.SEMIANNUALLY}>
                            Semi-annually
                          </SelectItem>
                          <SelectItem value={RecurringFrequency.ANNUALLY}>
                            Annually
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="interval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Every</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {watchFrequency === RecurringFrequency.MONTHLY
                          ? "month(s)"
                          : watchFrequency === RecurringFrequency.WEEKLY
                            ? "week(s)"
                            : "period(s)"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(watchFrequency === RecurringFrequency.MONTHLY ||
                  watchFrequency === RecurringFrequency.QUARTERLY ||
                  watchFrequency === RecurringFrequency.SEMIANNUALLY ||
                  watchFrequency === RecurringFrequency.ANNUALLY) && (
                  <FormField
                    control={form.control as any}
                    name="dayOfMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day of Month</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            placeholder="1"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>1-31</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {watchFrequency === RecurringFrequency.WEEKLY && (
                  <FormField
                    control={form.control as any}
                    name="dayOfWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day of Week</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(Number(value))
                          }
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">Sunday</SelectItem>
                            <SelectItem value="1">Monday</SelectItem>
                            <SelectItem value="2">Tuesday</SelectItem>
                            <SelectItem value="3">Wednesday</SelectItem>
                            <SelectItem value="4">Thursday</SelectItem>
                            <SelectItem value="5">Friday</SelectItem>
                            <SelectItem value="6">Saturday</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control as any}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "MMM dd, yyyy")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto size-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "MMM dd, yyyy")
                              ) : (
                                <span>No end date</span>
                              )}
                              <CalendarIcon className="ml-auto size-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < (form.getValues("startDate") || new Date())
                            }
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>Leave blank for no end</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="dueDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Days</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="30"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Days after issue</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Line Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ description: "", quantity: 1, unitPrice: 0 })
                  }
                >
                  <Plus className="mr-2 size-4" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-3">
                    <FormField
                      control={form.control as any}
                      name={`lineItems.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder="Description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control as any}
                      name={`lineItems.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem className="w-24">
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Qty"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control as any}
                      name={`lineItems.${index}.unitPrice`}
                      render={({ field }) => (
                        <FormItem className="w-32">
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Price"
                              step="0.01"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="w-32 flex items-center justify-end text-sm">
                      $
                      {(
                                (watchLineItems[index]?.quantity || 0) *
                                (watchLineItems[index]?.unitPrice || 0)
                      ).toFixed(2)}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control as any}
                  name="taxRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Rate (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="0"
                          {...field}
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
                    <FormItem>
                      <FormLabel>Discount Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Discount:</span>
                  <span>-${(watchDiscountAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Additional Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Additional Settings</h3>

              <FormField
                control={form.control as any}
                name="autoSend"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Auto-send Invoices</FormLabel>
                      <FormDescription>
                        Automatically email invoices to client when generated
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="sendReminders"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Send Payment Reminders</FormLabel>
                      <FormDescription>
                        Automatically send reminders for overdue invoices
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes for the invoice"
                        {...field}
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
                    <FormLabel>Terms & Conditions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Payment terms and conditions"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? isEdit
                    ? "Updating..."
                    : "Creating..."
                  : isEdit
                    ? "Update Recurring Invoice"
                    : "Create Recurring Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
