"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTRPC } from "@/trpc/client";

const bankTransferSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  transferType: z
    .enum(["UK_DOMESTIC", "INTERNATIONAL", "US_DOMESTIC"])
    .default("UK_DOMESTIC"),
  bankName: z.string().optional(),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  sortCode: z.string().optional(),
  routingNumber: z.string().optional(),
  iban: z.string().optional(),
  swiftBic: z.string().optional(),
  accountType: z.string().optional(),
  currency: z.string().default("GBP"),
  instructions: z.string().optional(),
  referenceFormat: z.string().default("INV-{invoiceNumber}"),
  autoReminders: z.boolean().default(true),
  reminderDays: z.string().default("3,7,14"),
});

type BankTransferSettingsFormValues = z.infer<
  typeof bankTransferSettingsSchema
>;

export function BankTransferSettingsForm() {
  const trpc = useTRPC();
  const [isSaving, setIsSaving] = useState(false);

  // Fetch existing settings
  const { data: settings, isLoading, error } = useQuery({
    ...trpc.bankTransferSettings.get.queryOptions({}),
    retry: false,
  });

  // Log any query errors
  useEffect(() => {
    if (error) {
      console.error('[Form] Query error:', error);
    }
  }, [error]);

  const form = useForm<BankTransferSettingsFormValues>({
    resolver: zodResolver(bankTransferSettingsSchema) as any,
    defaultValues: {
      enabled: false,
      transferType: "UK_DOMESTIC",
      bankName: "",
      accountName: "",
      accountNumber: "",
      sortCode: "",
      routingNumber: "",
      iban: "",
      swiftBic: "",
      accountType: "",
      currency: "GBP",
      instructions: "",
      referenceFormat: "INV-{invoiceNumber}",
      autoReminders: true,
      reminderDays: "3,7,14",
    },
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      try {
        form.reset({
          enabled: settings.enabled ?? false,
          transferType:
            (settings.transferType as
              | "UK_DOMESTIC"
              | "INTERNATIONAL"
              | "US_DOMESTIC") || "UK_DOMESTIC",
          bankName: settings.bankName || "",
          accountName: settings.accountName || "",
          accountNumber: settings.accountNumber || "",
          sortCode: settings.sortCode || "",
          routingNumber: settings.routingNumber || "",
          iban: settings.iban || "",
          swiftBic: settings.swiftBic || "",
          accountType: settings.accountType || "",
          currency: settings.currency || "GBP",
          instructions: settings.instructions || "",
          referenceFormat: settings.referenceFormat || "INV-{invoiceNumber}",
          autoReminders: settings.autoReminders ?? true,
          reminderDays: Array.isArray(settings.reminderDays)
            ? (settings.reminderDays as number[]).join(",")
            : "3,7,14",
        });
      } catch (err) {
        console.error('[Form] Error resetting form:', err);
      }
    }
  }, [settings, form]);

  const { mutate: saveSettings } = useMutation(
    trpc.bankTransferSettings.upsert.mutationOptions({
      onSuccess: () => {
        toast.success("Bank transfer settings saved");
        setIsSaving(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to save settings");
        setIsSaving(false);
      },
    })
  );

  const onSubmit = (data: BankTransferSettingsFormValues) => {
    setIsSaving(true);

    // Parse reminder days from string to array
    const reminderDaysArray = data.reminderDays
      ? data.reminderDays.split(",").map((d) => parseInt(d.trim()))
      : [];

    saveSettings({
      enabled: data.enabled,
      transferType: data.transferType,
      bankName: data.bankName || undefined,
      accountName: data.accountName || undefined,
      accountNumber: data.accountNumber || undefined,
      sortCode: data.sortCode || undefined,
      routingNumber: data.routingNumber || undefined,
      iban: data.iban || undefined,
      swiftBic: data.swiftBic || undefined,
      accountType: data.accountType || undefined,
      currency: data.currency,
      instructions: data.instructions || undefined,
      referenceFormat: data.referenceFormat || undefined,
      autoReminders: data.autoReminders,
      reminderDays: reminderDaysArray,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 h-[calc(100svh-10rem)]">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
        <Card className="px-8 rounded-none border-none shadow-none bg-transparent">
          <FormField
            control={form.control as any}
            name="enabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between">
                <div className="">
                  <FormLabel className="text-base font-medium text-primary">
                    Enable bank transfer
                  </FormLabel>
                  <FormDescription>
                    Allow customers to pay invoices via bank transfer
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
        </Card>

        <Separator />

        {form.watch("enabled") && (
          <>
            <Card className="rounded-none border-none shadow-none bg-transparent pt-0">
              <div className="px-8">
                <h3 className="text-base font-medium text-primary">
                  Bank details
                </h3>
                <p className="text-xs text-primary/75">
                  Enter your bank account information
                </p>
              </div>

              <Separator />

              <FormField
                control={form.control as any}
                name="transferType"
                render={({ field }) => (
                  <FormItem className="px-8">
                    <FormLabel>Transfer type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select transfer type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="UK_DOMESTIC">
                          UK Domestic (Sort Code & Account Number)
                        </SelectItem>
                        <SelectItem value="INTERNATIONAL">
                          International (IBAN & SWIFT/BIC)
                        </SelectItem>
                        <SelectItem value="US_DOMESTIC">
                          US Domestic (Routing & Account Number)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose the type of bank transfer you'll accept
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2 px-8">
                <FormField
                  control={form.control as any}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Barclays" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="accountName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Account holder name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("transferType") === "UK_DOMESTIC" && (
                  <>
                    <FormField
                      control={form.control as any}
                      name="sortCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sort Code</FormLabel>
                          <FormControl>
                            <Input placeholder="12-34-56" {...field} />
                          </FormControl>
                          <FormDescription>
                            6-digit UK sort code
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control as any}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input placeholder="12345678" {...field} />
                          </FormControl>
                          <FormDescription>
                            8-digit account number
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {form.watch("transferType") === "US_DOMESTIC" && (
                  <>
                    <FormField
                      control={form.control as any}
                      name="routingNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Routing Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ABA routing number"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            9-digit ABA routing number
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control as any}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Account number" {...field} />
                          </FormControl>
                          <FormDescription className="text-transparent">
                            .
                          </FormDescription>
                          <FormMessage />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {form.watch("transferType") === "INTERNATIONAL" && (
                  <>
                    <FormField
                      control={form.control as any}
                      name="iban"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IBAN</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="GB29 NWBK 6016 1331 9268 19"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            International Bank Account Number
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control as any}
                      name="swiftBic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SWIFT/BIC</FormLabel>
                          <FormControl>
                            <Input placeholder="NWBKGB2L" {...field} />
                          </FormControl>
                          <FormDescription>SWIFT/BIC code</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={form.control as any}
                  name="accountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Type (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Business Current"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Input placeholder="GBP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            <Separator />

            <Card className="rounded-none border-none shadow-none bg-transparent py-0">
              <div className="px-8">
                <h3 className="text-base font-medium text-primary">
                  Payment instructions
                </h3>
                <p className="text-xs text-primary/75">
                  Customize the payment reference and instructions
                </p>
              </div>

              <Separator />

              <FormField
                control={form.control as any}
                name="referenceFormat"
                render={({ field }) => (
                  <FormItem className="px-8">
                    <FormLabel>Payment reference format</FormLabel>
                    <FormControl>
                      <Input placeholder="INV-{invoiceNumber}" {...field} />
                    </FormControl>
                    <FormDescription>
                      Use {"{invoiceNumber}"} as placeholder. Example: INV-
                      {"{invoiceNumber}"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="instructions"
                render={({ field }) => (
                  <FormItem className="px-8">
                    <FormLabel>Additional instructions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any additional payment instructions for customers..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional instructions displayed to customers
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Card>

            <Separator />

            <Card className=" rounded-none border-none shadow-none bg-transparent py-0">
              <div className="px-8">
                <h3 className="text-base font-medium text-primary">
                  Reminders
                </h3>
                <p className="text-xs text-primary/75">
                  Configure automated payment reminders
                </p>
              </div>

              <Separator />

              <FormField
                control={form.control as any}
                name="autoReminders"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between px-8">
                    <div className="space-y-0.5">
                      <FormLabel>Automatic reminders</FormLabel>
                      <FormDescription>
                        Send automated reminders for pending bank transfers
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

              {form.watch("autoReminders") && (
                <FormField
                  control={form.control as any}
                  name="reminderDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reminder days</FormLabel>
                      <FormControl>
                        <Input placeholder="3,7,14" {...field} />
                      </FormControl>
                      <FormDescription>
                        Days after invoice sent to send reminders
                        (comma-separated)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </Card>
          </>
        )}

        <Separator />

        <div className="flex justify-end px-8 pb-8">
          <Button
            type="submit"
            disabled={isSaving}
            className="w-max ml-auto"
            variant="gradient"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save settings"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
