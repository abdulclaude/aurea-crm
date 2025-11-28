"use client";

import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";

import {
  Sheet,
  ResizableSheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContactType, LifecycleStage } from "@prisma/client";
import { VariableInput } from "@/components/tiptap/variable-input";
import type { VariableItem } from "@/components/tiptap/variable-suggestion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required. " })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers and underscores.",
    }),
  contactId: z.string().min(1, "Contact ID is required"),
  name: z.string().optional(),
  email: z.string().optional(),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  type: z.nativeEnum(ContactType).optional(),
  lifecycleStage: z.nativeEnum(LifecycleStage).optional(),
  source: z.string().optional(),
  website: z.string().optional(),
  linkedin: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
});

export type UpdateContactFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  defaultValues?: Partial<UpdateContactFormValues>;
  variables: VariableItem[];
}

export const UpdateContactDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  variables,
}) => {
  const [useVariableInput, setUseVariableInput] = useState(false);
  const trpc = useTRPC();

  // Fetch contacts list for Select mode
  const contactsQuery = useQuery(
    trpc.contacts.list.queryOptions({
      cursor: undefined,
      limit: 100,
    })
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      contactId: defaultValues.contactId || "",
      name: defaultValues.name || "",
      email: defaultValues.email || "",
      companyName: defaultValues.companyName || "",
      phone: defaultValues.phone || "",
      position: defaultValues.position || "",
      type: defaultValues.type,
      lifecycleStage: defaultValues.lifecycleStage,
      source: defaultValues.source || "",
      website: defaultValues.website || "",
      linkedin: defaultValues.linkedin || "",
      country: defaultValues.country || "",
      city: defaultValues.city || "",
      notes: defaultValues.notes || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        contactId: defaultValues.contactId || "",
        name: defaultValues.name || "",
        email: defaultValues.email || "",
        companyName: defaultValues.companyName || "",
        phone: defaultValues.phone || "",
        position: defaultValues.position || "",
        type: defaultValues.type,
        lifecycleStage: defaultValues.lifecycleStage,
        source: defaultValues.source || "",
        website: defaultValues.website || "",
        linkedin: defaultValues.linkedin || "",
        country: defaultValues.country || "",
        city: defaultValues.city || "",
        notes: defaultValues.notes || "",
      });
    }
  }, [
    open,
    defaultValues.variableName,
    defaultValues.contactId,
    defaultValues.name,
    defaultValues.email,
    defaultValues.companyName,
    defaultValues.phone,
    defaultValues.position,
    defaultValues.type,
    defaultValues.lifecycleStage,
    defaultValues.source,
    defaultValues.website,
    defaultValues.linkedin,
    defaultValues.country,
    defaultValues.city,
    defaultValues.notes,
    form,
  ]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ResizableSheetContent className="overflow-y-auto sm:max-w-xl bg-background border-black/10">
        <SheetHeader className="px-6 p-6 pb-2 gap-1">
          <SheetTitle>Update Contact Configuration</SheetTitle>
          <SheetDescription>
            Update an existing contact in your CRM. Only fill in fields you want
            to update.
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-4 bg-black/10" />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 px-6 pb-6"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="myContact" {...field} />
                  </FormControl>
                  <FormDescription>
                    Reference the updated contact in other nodes
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactId"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel>Contact ID</FormLabel>
                    <div className="flex items-center space-x-2">
                      <Label
                        htmlFor="use-variable-contact"
                        className="text-xs text-primary/75 cursor-pointer"
                      >
                        Use variables
                      </Label>
                      <Switch
                        id="use-variable-contact"
                        checked={useVariableInput}
                        onCheckedChange={setUseVariableInput}
                      />
                    </div>
                  </div>
                  <FormControl>
                    {useVariableInput ? (
                      <VariableInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Type @variables to insert variables"
                        className="h-13"
                        variables={variables}
                      />
                    ) : (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={contactsQuery.isLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              contactsQuery.isLoading
                                ? "Loading contacts..."
                                : "Select a contact"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {contactsQuery.data?.items?.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {contact.name}
                                </span>
                                {contact.email && (
                                  <span className="text-xs text-primary/75">
                                    {contact.email}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          )) ?? (
                            <div className="px-2 py-4 text-sm text-primary/75">
                              No contacts found
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </FormControl>
                  <FormDescription>
                    {useVariableInput ? (
                      <>
                        Type <span className="text-primary font-medium">@</span>{" "}
                        or <span className="text-primary font-medium">/</span>{" "}
                        to insert context variables
                      </>
                    ) : (
                      "Select an existing contact from your CRM"
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <p className="text-sm text-primary/75">
              Optional: Fill only the fields you want to update
            </p>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name (optional)</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="John Doe or @variables"
                      className="h-13"
                      variables={variables}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (optional)</FormLabel>
                    <FormControl>
                      <VariableInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="john@example.com or @variables"
                        className="h-13"
                        variables={variables}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (optional)</FormLabel>
                    <FormControl>
                      <VariableInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="+1234567890 or @variables"
                        className="h-13"
                        variables={variables}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type (optional)</FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={(val) => field.onChange(val || undefined)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Leave unchanged" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ContactType.LEAD}>Lead</SelectItem>
                        <SelectItem value={ContactType.PROSPECT}>
                          Prospect
                        </SelectItem>
                        <SelectItem value={ContactType.CUSTOMER}>
                          Customer
                        </SelectItem>
                        <SelectItem value={ContactType.CHURN}>Churn</SelectItem>
                        <SelectItem value={ContactType.CLOSED}>
                          Closed
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lifecycleStage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lifecycle Stage (optional)</FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={(val) => field.onChange(val || undefined)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder="Leave unchanged" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={LifecycleStage.SUBSCRIBER}>
                          Subscriber
                        </SelectItem>
                        <SelectItem value={LifecycleStage.LEAD}>
                          Lead
                        </SelectItem>
                        <SelectItem value={LifecycleStage.MQL}>MQL</SelectItem>
                        <SelectItem value={LifecycleStage.SQL}>SQL</SelectItem>
                        <SelectItem value={LifecycleStage.OPPORTUNITY}>
                          Opportunity
                        </SelectItem>
                        <SelectItem value={LifecycleStage.CUSTOMER}>
                          Customer
                        </SelectItem>
                        <SelectItem value={LifecycleStage.EVANGELIST}>
                          Evangelist
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <VariableInput
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Additional notes about this contact or @variables"
                      variables={variables}
                      className="h-24"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormDescription className="text-xs leading-5">
              Use{" "}
              <span className="text-primary font-medium tracking-wide">
                {"@variables"}
              </span>{" "}
              to reference data from previous nodes.
            </FormDescription>

            <SheetFooter className="mt-6 px-0 pb-4">
              <Button
                type="submit"
                className="bg-primary-foreground hover:bg-primary/10 hover:text-black text-primary w-full"
              >
                Save changes
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </ResizableSheetContent>
    </Sheet>
  );
};
