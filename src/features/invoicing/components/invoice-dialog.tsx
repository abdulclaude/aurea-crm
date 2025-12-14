"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, Plus, Trash2, Upload, FileText, X, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { format } from "date-fns";
import z from "zod";
import { useUploadThing } from "@/utils/uploadthing";
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
import { BillingModel, InvoiceType } from "@prisma/client";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unitPrice: z.coerce.number().min(0, "Unit price must be positive"),
});

const formSchema = z.object({
  contactId: z.string().optional(),
  contactName: z.string().min(1, "Client name is required"),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  title: z.string().optional(),
  type: z.nativeEnum(InvoiceType),
  billingModel: z.nativeEnum(BillingModel),
  templateId: z.string().optional(),
  dueDate: z.date(),
  lineItems: z
    .array(lineItemSchema)
    .min(1, "At least one line item is required"),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  termsConditions: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId?: string; // For editing existing invoice
  defaultType?: "SENT" | "RECEIVED"; // Default invoice type for new invoices
}

export function InvoiceDialog({
  open,
  onOpenChange,
  invoiceId,
  defaultType = "SENT",
}: InvoiceDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const isEdit = !!invoiceId;

  // Fetch invoice if editing
  const { data: invoice } = useQuery({
    ...trpc.invoices.getById.queryOptions({ id: invoiceId! }),
    enabled: isEdit && open,
  });

  // Fetch contacts for dropdown
  const { data: contactsData } = useQuery({
    ...trpc.contacts.list.queryOptions({
      limit: 100,
    }),
    enabled: open,
  });

  const contacts = contactsData?.items ?? [];

  // Fetch templates for dropdown
  const { data: templatesData } = useQuery({
    ...trpc.invoices.listTemplates.queryOptions({
      limit: 100,
    }),
    enabled: open,
  });

  const templates = templatesData?.items ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      contactName: "",
      contactEmail: "",
      title: "",
      type: defaultType === "SENT" ? InvoiceType.SENT : InvoiceType.RECEIVED,
      billingModel: BillingModel.CUSTOM,
      templateId: undefined,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      lineItems: [{ description: "", quantity: 1, unitPrice: 0 }],
      taxRate: 0,
      discountAmount: 0,
      notes: "",
      termsConditions: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  // Document upload state
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  const { startUpload, isUploading: uploadThingUploading } = useUploadThing(
    "invoiceDocument",
    {
      onClientUploadComplete: async (res) => {
        if (res && res[0]) {
          setDocumentUrl(res[0].url);
          toast.success("Document uploaded successfully!");
          setIsUploadingDocument(false);
        }
      },
      onUploadError: (error: Error) => {
        console.error("Upload error:", error);
        toast.error(`Upload failed: ${error.message}`);
        setIsUploadingDocument(false);
      },
    }
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (16MB max)
    if (file.size > 16 * 1024 * 1024) {
      toast.error("File size must be less than 16MB");
      return;
    }

    setIsUploadingDocument(true);
    try {
      await startUpload([file]);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
      setIsUploadingDocument(false);
    }
  };

  // Reset form when dialog opens or defaultType changes
  useEffect(() => {
    if (!open) return;

    if (invoice && isEdit) {
      // Check if invoice data is fully loaded
      const lineItems = (invoice as any).lineItems;
      if (!lineItems) {
        // Data not fully loaded yet, skip reset
        return;
      }

      // Editing existing invoice
      form.reset({
        contactId: invoice.contactId ?? undefined,
        contactName: invoice.contactName,
        contactEmail: invoice.contactEmail ?? "",
        title: invoice.title ?? "",
        type: (invoice as any).type ?? InvoiceType.SENT,
        billingModel: invoice.billingModel,
        templateId: undefined,
        dueDate: new Date(invoice.dueDate),
        lineItems: lineItems.map((item: any) => ({
          description: item.description,
          quantity: parseFloat(item.quantity.toString()),
          unitPrice: parseFloat(item.unitPrice.toString()),
        })),
        taxRate: invoice.taxRate ? parseFloat(invoice.taxRate.toString()) : 0,
        discountAmount: parseFloat(invoice.discountAmount.toString()),
        notes: invoice.notes ?? "",
        termsConditions: invoice.termsConditions ?? "",
      });
      setDocumentUrl((invoice as any).documentUrl ?? null);
    } else if (!isEdit) {
      // Creating new invoice - reset to default values with correct type
      form.reset({
        contactName: "",
        contactEmail: "",
        title: "",
        type: defaultType === "SENT" ? InvoiceType.SENT : InvoiceType.RECEIVED,
        billingModel: BillingModel.CUSTOM,
        templateId: undefined,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lineItems: [{ description: "", quantity: 1, unitPrice: 0 }],
        taxRate: 0,
        discountAmount: 0,
        notes: "",
        termsConditions: "",
      });
      setDocumentUrl(null);
    }
  }, [open, invoice, isEdit, defaultType, form]);

  // Create mutation
  const { mutate: createInvoice, isPending: isCreating } = useMutation(
    trpc.invoices.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.invoices.list.queryOptions({}).queryKey,
        });
        toast.success("Invoice created successfully");
        onOpenChange(false);
        form.reset();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create invoice");
      },
    })
  );

  // Update mutation
  const { mutate: updateInvoice, isPending: isUpdating } = useMutation(
    trpc.invoices.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.invoices.list.queryOptions({}).queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: trpc.invoices.getById.queryOptions({ id: invoiceId! })
            .queryKey,
        });
        toast.success("Invoice updated successfully");
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update invoice");
      },
    })
  );

  const isPending = isCreating || isUpdating;

  const onSubmit = (values: FormValues) => {
    const dataWithDocument = {
      ...values,
      documentUrl: documentUrl ?? undefined,
    };

    if (isEdit && invoiceId) {
      updateInvoice({
        id: invoiceId,
        ...dataWithDocument,
      });
    } else {
      createInvoice(dataWithDocument);
    }
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

  // Calculate totals
  const lineItems = form.watch("lineItems");
  const taxRate = form.watch("taxRate") || 0;
  const discountAmount = form.watch("discountAmount") || 0;

  const subtotal = lineItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount - discountAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto px-0">
        <DialogHeader className="px-6">
          <DialogTitle>
            {isEdit
              ? "Edit invoice"
              : form.watch("type") === InvoiceType.SENT
                ? "Create new invoice"
                : "Record invoice"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update invoice details and line items"
              : form.watch("type") === InvoiceType.SENT
                ? "Fill in the details to create a new invoice"
                : "Record an invoice received from a vendor or contractor"}
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
            {/* Hidden type field to preserve invoice type */}
            <FormField
              control={form.control as any}
              name="type"
              render={({ field }) => (
                <input type="hidden" {...field} value={field.value} />
              )}
            />

            {/* Client Information */}
            <div className="space-y-4 px-6">
              <h3 className="text-sm font-medium">
                {form.watch("type") === InvoiceType.SENT
                  ? "Client information"
                  : "Vendor information"}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control as any}
                  name="contactId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {form.watch("type") === InvoiceType.SENT
                          ? "Select contact (optional)"
                          : "Select vendor (optional)"}
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                form.watch("type") === InvoiceType.SENT
                                  ? "Choose existing contact"
                                  : "Choose existing vendor"
                              }
                            />
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
                      <FormLabel>
                        {form.watch("type") === InvoiceType.SENT
                          ? "Client name"
                          : "Vendor name"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={
                            form.watch("type") === InvoiceType.SENT
                              ? "John Doe"
                              : "Acme Services Ltd"
                          }
                        />
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
                      <FormLabel>
                        {form.watch("type") === InvoiceType.SENT
                          ? "Client email"
                          : "Vendor email"}
                      </FormLabel>
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
                        <Input {...field} placeholder="Monthly Services" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Invoice Details */}
            <div className="space-y-4 px-6">
              <h3 className="text-sm font-medium">Invoice details</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control as any}
                  name="billingModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing model</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          <SelectItem value={BillingModel.CUSTOM}>
                            Custom
                          </SelectItem>
                          <SelectItem value={BillingModel.HOURLY}>
                            Hourly
                          </SelectItem>
                          <SelectItem value={BillingModel.PER_SHIFT}>
                            Per Shift
                          </SelectItem>
                          <SelectItem value={BillingModel.RETAINER}>
                            Retainer
                          </SelectItem>
                          <SelectItem value={BillingModel.PROJECT_MILESTONE}>
                            Project Milestone
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="templateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice template</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Default (Minimal)" />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          <SelectItem value="__default__">
                            Default (Minimal)
                          </SelectItem>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
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
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
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
              </div>
            </div>

            <Separator />

            {/* Line Items */}
            <div className="space-y-4 px-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Line items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ description: "", quantity: 1, unitPrice: 0 })
                  }
                >
                  <Plus className="size-3" />
                  Add item
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-12 gap-2 items-start"
                  >
                    <div className="col-span-7">
                      <FormField
                        control={form.control as any}
                        name={`lineItems.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && <FormLabel>Description</FormLabel>}
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Service or product"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="col-span-2">
                      <FormField
                        control={form.control as any}
                        name={`lineItems.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && <FormLabel>Quantity</FormLabel>}
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                min="0"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="col-span-2">
                      <FormField
                        control={form.control as any}
                        name={`lineItems.${index}.unitPrice`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && <FormLabel>Price</FormLabel>}
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                min="0"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="col-span-1 flex w-full">
                      {index === 0 && <div className="h-10" />}
                      {fields.length > 1 && (
                        <div className="flex flex-col space-y-2 w-full">
                          {index === 0 && (
                            <FormLabel className="text-white">.</FormLabel>
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => remove(index)}
                            className="py-3! flex items-center justify-center w-full"
                          >
                            <Trash2 className="size-3.5 h-max" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Financial Details */}
            <div className="space-y-4 px-6">
              <h3 className="text-sm font-medium">Financial details</h3>
              <div className="grid grid-cols-2 gap-4">
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
                    <FormItem>
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

              {/* Totals Summary */}
              <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      Tax ({taxRate}%):
                    </span>
                    <span className="font-medium">${taxAmount.toFixed(2)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="font-medium text-green-600">
                      -${discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-4 px-6">
              <FormField
                control={form.control as any}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={
                          form.watch("type") === InvoiceType.SENT
                            ? "Additional notes for the client"
                            : "Internal notes about this invoice"
                        }
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("type") === InvoiceType.SENT && (
                <FormField
                  control={form.control as any}
                  name="termsConditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Terms & Conditions</FormLabel>
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
              )}

              {/* Document Upload - Show for RECEIVED invoices or optionally for SENT */}
              <div className="space-y-2">
                <Label>Invoice Document</Label>
                {documentUrl ? (
                  <div className="flex items-center gap-2 rounded-md border p-3">
                    <FileText className="size-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <a
                        href={documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline truncate block"
                      >
                        View document
                      </a>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDocumentUrl(null)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      id="invoice-document-upload"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileSelect}
                      disabled={isUploadingDocument || uploadThingUploading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        document.getElementById("invoice-document-upload")?.click()
                      }
                      disabled={isUploadingDocument || uploadThingUploading}
                      className="w-full"
                    >
                      {isUploadingDocument || uploadThingUploading ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="size-4 mr-2" />
                          Upload Invoice Document
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF or image file, max 16MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

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
                {isPending
                  ? isEdit
                    ? "Updating..."
                    : form.watch("type") === InvoiceType.SENT
                      ? "Creating..."
                      : "Recording..."
                  : isEdit
                    ? "Update invoice"
                    : form.watch("type") === InvoiceType.SENT
                      ? "Create invoice"
                      : "Record invoice"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
